import { TestCaseExecutionResult } from "../services/execution.service";

export type TestCaseStatus = "passed" | "wrong_answer" | "runtime_error" | "timeout";

export function classifyTestCaseResult(result: TestCaseExecutionResult): TestCaseStatus {
  if (result.passed) return "passed";
  if (result.timedOut) return "timeout";
  if (result.stderr && result.stderr.trim().length > 0) return "runtime_error";
  return "wrong_answer";
}