import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

/**
 * ============================================================================
 * SCOPED SECURITY TRADEOFF — document this explicitly in your report.
 * ============================================================================
 * This runs untrusted student code as a subprocess on the SAME container as
 * the API server, using OS-level limits (timeout, output size cap, minimal
 * env, no shell). It does NOT provide per-submission container isolation
 * (fresh Docker container per run), which is the gold-standard approach used
 * by real judges (LeetCode/HackerRank/Judge0).
 *
 * Why this scope: full per-submission container orchestration (spin up,
 * resource-limit, tear down, cleanup on crash) is a multi-day build on its
 * own and was descoped for the one-week timeline.
 *
 * Mitigations actually in place:
 * - Hard execution timeout (per-question configurable, default 3s)
 * - Output size cap (prevents memory exhaustion via huge stdout)
 * - No shell interpolation — execFile with an argument array, not exec()
 *   with a concatenated string, so there's no command-injection surface
 *   from the code content itself
 * - Runs as the same non-root `appuser` already set in the Dockerfile
 * - Python's -I (isolated mode) and -B (no bytecode cache) flags reduce
 *   some attack surface (ignores PYTHONPATH/user site-packages)
 *
 * NOT mitigated by this implementation (call these out as known
 * limitations in your threat model, section "Design and Implementation"):
 * - A malicious submission CAN still make outbound network calls (no
 *   network namespace isolation at the process level)
 * - Filesystem access is not chrooted/jailed — code runs with the same
 *   filesystem visibility as the backend process
 * - No per-submission memory/CPU cgroup limit (only wall-clock timeout)
 *
 * Recommended upgrade path (mention in report as "future work"): move this
 * into a separate worker service running in its own Docker container with
 * --network none, a read-only root filesystem, and cgroup memory/CPU
 * limits — SubmissionJob (see models) is already shaped to support this
 * as an async queue without changing the API contract.
 * ============================================================================
 */

const EXECUTION_TMP_ROOT = path.join(os.tmpdir(), "code-exec");
const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB cap on captured stdout/stderr

export interface TestCaseExecutionResult {
  passed: boolean;
  weight: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
}

async function runOnce(code: string, stdin: string, timeLimitMs: number): Promise<{ stdout: string; stderr: string; timedOut: boolean }> {
  await fs.mkdir(EXECUTION_TMP_ROOT, { recursive: true });
  const fileId = crypto.randomUUID();
  const filePath = path.join(EXECUTION_TMP_ROOT, `${fileId}.py`);

  await fs.writeFile(filePath, code, { mode: 0o600 });

  try {
    return await new Promise<{ stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
      const child = spawn("python3", ["-I", "-B", filePath], {
        // Minimal environment — don't leak the backend's own secrets
        // (JWT keys, DB URI, etc.) into the executed process's env.
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeLimitMs);

      child.stdout.on("data", (chunk) => {
        if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
      });

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ stdout: "", stderr: err.message, timedOut: false });
      });

      child.on("close", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          stdout,
          stderr: timedOut ? "Execution timed out." : stderr,
          timedOut,
        });
      });

      child.stdin.write(stdin);
      child.stdin.end();
    });
  } finally {
    await fs.unlink(filePath).catch(() => {
      /* best-effort cleanup — don't fail the request if this fails */
    });
  }
}

export async function runAgainstTestCases(
  code: string,
  testCases: { input: string; expectedOutput: string; weight: number }[],
  timeLimitMs: number,
): Promise<TestCaseExecutionResult[]> {
  // Sequential execution (not Promise.all) — deliberately bounds concurrent
  // subprocess load per submission. If you want parallelism for speed later,
  // cap it (e.g. p-limit) rather than firing all test cases at once; this
  // endpoint sits behind submissionLimiter but subprocess fan-out is still
  // worth bounding independently.
  const results: TestCaseExecutionResult[] = [];

  for (const tc of testCases) {
    const { stdout, stderr, timedOut } = await runOnce(code, tc.input, timeLimitMs);
    const passed = !timedOut && stdout.trim() === tc.expectedOutput.trim();
    results.push({ passed, weight: tc.weight, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000), timedOut });
  }

  return results;
}
