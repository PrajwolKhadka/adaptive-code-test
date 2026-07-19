"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAuth } from "@/components/RouteGuards";
import { StudentQuestionView, SubmitAttemptResponse } from "@/types/test";

function TestPageContent() {
  const router = useRouter();
  const params = useParams<{ testId: string }>();
  const testId = params.testId;

  const [question, setQuestion] = useState<StudentQuestionView | null>(null);
  const [progress, setProgress] = useState<{ answered: number; total: number } | null>(null);
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
      await apiClient.post(`/tests/${testId}/hint`, { questionId: question.id });
      // Re-fetch the question so unlockedHints reflects the new purchase —
      // simplest way to stay in sync with server state without duplicating
      // the hint-reveal logic client-side.
      const res = await apiClient.get(`/tests/${testId}/next-question`);
      if (!res.data.data.done) {
        setQuestion(res.data.data.question);
      }
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
        <p className="text-sm text-red-600">{error ?? "No question available."}</p>
      </main>
    );
  }

  const hintsRemaining = question.hintsAvailable - question.unlockedHints.length;

  return (
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
                style={{ width: `${(progress.answered / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <p className="mb-4 whitespace-pre-wrap text-sm text-gray-700">{question.prompt}</p>

        {question.visibleTestCases.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-medium text-gray-900">Example test cases</h2>
            {question.visibleTestCases.map((tc, i) => (
              <div key={i} className="mb-2 rounded-md bg-gray-50 p-3 font-mono text-xs">
                <div>
                  <span className="text-gray-500">Input:</span> {tc.input || "(none)"}
                </div>
                <div>
                  <span className="text-gray-500">Expected:</span> {tc.expectedOutput}
                </div>
              </div>
            ))}
            {question.hiddenTestCaseCount > 0 && (
              <p className="text-xs text-gray-400">+ {question.hiddenTestCaseCount} hidden test case(s)</p>
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
              {hintsRemaining > 0 ? `Buy next hint (${question.hintCostExp} EXP)` : "No more hints"}
            </button>
          </div>
          {question.unlockedHints.map((hint, i) => (
            <p key={i} className="mb-1 rounded-md bg-yellow-50 p-2 text-xs text-gray-700">
              {hint}
            </p>
          ))}
        </div>
      </div>

      {/* Right: editor + submit */}
      <div className="flex flex-col">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="mb-3 flex-1 overflow-hidden rounded-md border border-gray-300">
          <Editor
            height="60vh"
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
          <div className={`mb-3 rounded-md p-3 text-sm ${result.passed ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            <p className="mb-2 font-medium">
              {result.passed ? "All test cases passed!" : `Partial credit: ${(result.effectiveCorrectness * 100).toFixed(0)}%`}
            </p>
            <ul className="mb-3 space-y-1 text-xs">
              {result.testCaseResults.map((tc, i) => (
                <li key={i}>
                  Test case {i + 1}: {tc.passed ? "✓ passed" : "✗ failed"}
                </li>
              ))}
            </ul>
            <button onClick={loadNextQuestion} className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800">
              Next question →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function TestPage() {
  return (
    <RequireAuth>
      <TestPageContent />
    </RequireAuth>
  );
}
