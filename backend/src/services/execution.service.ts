import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const EXECUTION_TMP_ROOT = path.join(os.tmpdir(), "code-exec");
const MAX_OUTPUT_BYTES = 64 * 1024; // 64KB cap on captured stdout/stderr

export interface TestCaseExecutionResult {
  passed: boolean;
  weight: number;
  stdout?: string;
  stderr?: string;
  timedOut?: boolean;
}
/**
 * Safely executes a single Python snippet in an isolated temporary file.
 *
 * Security measures:
 * - Writes code to a unique temp file with mode 0o600 (owner-only read/write).
 * - Runs python3 with -I (isolated mode: ignores PYTHONPATH, user site-packages)
 *   and -B (no .pyc files) to reduce environment influence.
 * - Minimal env (only PATH) so the process cannot inherit secrets or custom modules.
 * - Hard wall-clock timeout with SIGKILL to prevent infinite loops / resource exhaustion.
 * - Caps collected stdout/stderr to MAX_OUTPUT_BYTES to avoid memory DoS.
 * - Always deletes the temp file in a finally block, even on errors.
 * - stdin is written and closed immediately; no interactive shell is exposed.
 */
async function runOnce(code: string, stdin: string, timeLimitMs: number): Promise<{ stdout: string; stderr: string; timedOut: boolean }> {
  await fs.mkdir(EXECUTION_TMP_ROOT, { recursive: true });
  const fileId = crypto.randomUUID();
  const filePath = path.join(EXECUTION_TMP_ROOT, `${fileId}.py`);

  await fs.writeFile(filePath, code, { mode: 0o600 });

  try {
    return await new Promise<{ stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
      const child = spawn("python3", ["-I", "-B", filePath], {
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
      // Bound output size so a malicious print loop cannot exhaust memory
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
      // Feed stdin once and close, no interactive session
      child.stdin.write(stdin);
      child.stdin.end();
    });
  } finally {
    // Always clean up the source file, even if the process crashed
    await fs.unlink(filePath).catch(() => {
    });
  }
}

export async function runAgainstTestCases(
  code: string,
  testCases: { input: string; expectedOutput: string; weight: number }[],
  timeLimitMs: number,
): Promise<TestCaseExecutionResult[]> {
  const results: TestCaseExecutionResult[] = [];

  for (const tc of testCases) {
    const { stdout, stderr, timedOut } = await runOnce(code, tc.input, timeLimitMs);
    const passed = !timedOut && stdout.trim() === tc.expectedOutput.trim();
    results.push({ passed, weight: tc.weight, stdout: stdout.slice(0, 2000), stderr: stderr.slice(0, 2000), timedOut });
  }

  return results;
}
