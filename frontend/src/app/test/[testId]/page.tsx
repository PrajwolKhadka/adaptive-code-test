"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAuth } from "@/components/RouteGuards";
import { StudentQuestionView, SubmitAttemptResponse } from "@/types/test";
import { ExitConfirmToast } from "@/components/ExitConfirmToast";
import { useCurrentUser } from "@/lib/useCurrentUser";

function ExpBadge({ exp }: { exp: number | undefined }) {
  const prevExpRef = useRef<number | undefined>(exp);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (exp === undefined) return;
    if (prevExpRef.current !== undefined && prevExpRef.current !== exp) {
      setDelta(exp - prevExpRef.current);
      const timer = setTimeout(() => setDelta(null), 1800);
      prevExpRef.current = exp;
      return () => clearTimeout(timer);
    }
    prevExpRef.current = exp;
  }, [exp]);

  return (
    <div className="relative flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-gray-700">
      <span>{exp ?? "—"} EXP</span>
      {delta !== null && (
        <span
          className={`absolute -right-1 -top-3 animate-bounce text-xs font-semibold ${
            delta > 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
}

function TestPageContent() {
  const router = useRouter();
  const params = useParams<{ testId: string }>();
  const testId = params.testId;
  const { user, refreshUser } = useCurrentUser();

  const [question, setQuestion] = useState<StudentQuestionView | null>(null);
  const [progress, setProgress] = useState<{
    answered: number;
    total: number;
  } | null>(null);
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchasingHint, setPurchasingHint] = useState(false);
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNextQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.get(`/tests/${testId}/next-question`);
      if (res.data.data.done) {
        // No questions left — finalize and go straight to results.
        await apiClient.post(`/tests/${testId}/finalize`);
        router.push(`/test/${testId}/results`);
        return;
      }
      const q: StudentQuestionView = res.data.data.question;
      setQuestion(q);
      setProgress(res.data.data.progress);
      setCode(q.starterCode || "");
      setStartedAt(Date.now());
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [testId, router]);

  useEffect(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

  async function handleSubmit() {
    if (!question) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post(`/tests/${testId}/attempts`, {
        questionId: question.id,
        code,
        timeTakenMs: Date.now() - startedAt,
      });
      setResult(res.data.data);
      await refreshUser(); // sync EXP after any earned amount
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePurchaseHint() {
    if (!question) return;
    setPurchasingHint(true);
    setError(null);
    try {
      await apiClient.post(`/tests/${testId}/hint`, {
        questionId: question.id,
      });
      // Re-fetch the question so unlockedHints reflects the new purchase —
      // simplest way to stay in sync with server state without duplicating
      // the hint-reveal logic client-side.
      const res = await apiClient.get(`/tests/${testId}/next-question`);
      if (!res.data.data.done) {
        setQuestion(res.data.data.question);
      }
      await refreshUser(); // sync EXP after the deduction
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPurchasingHint(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading question…</p>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">
          {error ?? "No question available."}
        </p>
      </main>
    );
  }

  const hintsRemaining =
    question.hintsAvailable - question.unlockedHints.length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">
          Adaptive Code Platform
        </span>
        <div className="flex items-center gap-3">
          <ExpBadge exp={user?.exp} />
          <ExitConfirmToast
            message="Leave this test? Your progress on the current question will be lost, but earlier answers are already saved."
            destination="/dashboard"
          />
        </div>
      </header>
      <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-2 gap-6 px-4 py-6">
        {/* Left: problem statement */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">{question.title}</h1>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {question.difficulty.replace("_", " ")}
            </span>
          </div>

          {progress && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>
                  Question {progress.answered + 1} of {progress.total}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-1.5 rounded-full bg-gray-900 transition-all"
                  style={{
                    width: `${(progress.answered / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <p className="mb-4 whitespace-pre-wrap text-sm text-gray-700">
            {question.prompt}
          </p>

          {question.visibleTestCases.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-medium text-gray-900">
                Example test cases
              </h2>
              {question.visibleTestCases.map((tc, i) => (
                <div
                  key={i}
                  className="mb-2 rounded-md bg-gray-50 p-3 font-mono text-xs"
                >
                  <div>
                    <span className="text-gray-500">Input:</span>{" "}
                    {tc.input || "(none)"}
                  </div>
                  <div>
                    <span className="text-gray-500">Expected:</span>{" "}
                    {tc.expectedOutput}
                  </div>
                </div>
              ))}
              {question.hiddenTestCaseCount > 0 && (
                <p className="text-xs text-gray-400">
                  + {question.hiddenTestCaseCount} hidden test case(s)
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">Hints</h2>
              <button
                onClick={handlePurchaseHint}
                disabled={purchasingHint || hintsRemaining <= 0}
                className="text-xs text-gray-600 underline disabled:cursor-not-allowed disabled:text-gray-300"
              >
                {hintsRemaining > 0
                  ? `Buy next hint (${question.hintCostExp} EXP)`
                  : "No more hints"}
              </button>
            </div>
            {question.unlockedHints.map((hint, i) => (
              <p
                key={i}
                className="mb-1 rounded-md bg-yellow-50 p-2 text-xs text-gray-700"
              >
                {hint}
              </p>
            ))}
          </div>
        </div>

        {/* Right: editor + submit */}
        <div className="flex flex-col">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          <div className="mb-3 h-[560px] overflow-hidden rounded-md border border-gray-300">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-light"
              options={{ fontSize: 13, minimap: { enabled: false } }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="mb-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Running…" : "Submit"}
          </button>

          {result && (
            <div
              className={`mb-3 rounded-md p-3 text-sm ${result.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
            >
              <p className="mb-3 font-medium">
                {result.passed
                  ? "All test cases passed!"
                  : `Partial credit: ${(result.effectiveCorrectness * 100).toFixed(0)}%`}
              </p>
              <div className="mb-3 space-y-2">
                {result.testCaseResults.map((tc, i) => (
                  <TestCaseResultCard key={i} index={i} result={tc} />
                ))}
              </div>
              <button
                onClick={loadNextQuestion}
                className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800"
              >
                Next question →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function TestCaseResultCard({
  index,
  result,
}: {
  index: number;
  result: import("@/types/test").TestCaseResultDetail;
}) {
  const labels: Record<string, string> = {
    passed: "✓ Passed",
    wrong_answer: "✗ Wrong answer",
    runtime_error: "✗ Runtime error",
    timeout: "✗ Time limit exceeded",
  };
  const colors: Record<string, string> = {
    passed: "text-green-700",
    wrong_answer: "text-red-700",
    runtime_error: "text-orange-700",
    timeout: "text-orange-700",
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-800">
      <p className={`mb-1 font-medium ${colors[result.status]}`}>
        Test case {index + 1}: {labels[result.status]}
      </p>

      {result.input !== undefined && (
        <div className="space-y-0.5 font-mono">
          <p>
            <span className="text-gray-500">input:</span>{" "}
            {result.input || "(none)"}
          </p>
          <p>
            <span className="text-gray-500">expected:</span>{" "}
            {result.expectedOutput}
          </p>
          {result.actualOutput !== undefined && (
            <p>
              <span className="text-gray-500">your output:</span>{" "}
              {result.actualOutput || "(empty)"}
            </p>
          )}
        </div>
      )}

      {result.errorMessage && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-gray-900 p-2 font-mono text-[11px] text-red-300">
          {result.errorMessage}
        </pre>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <RequireAuth>
      <TestPageContent />
    </RequireAuth>
  );
}
