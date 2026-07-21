"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAuth } from "@/components/RouteGuards";
import { FinalizeResponse } from "@/types/test";

function TestResultsPageContent() {
  const params = useParams<{ testId: string }>();
  const [results, setResults] = useState<FinalizeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .post(`/tests/${params.testId}/finalize`)
      .then((res) => setResults(res.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params.testId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Finalizing your results…</p>
      </main>
    );
  }

  if (error || !results) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-600">{error ?? "Could not load results."}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold">Test complete</h1>

      <div className="grid w-full grid-cols-2 gap-4">
        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-2xl font-semibold">
            {results.correctCount}/{results.totalQuestions}
          </p>
          <p className="text-xs text-gray-500">Correct</p>
        </div>
        <div className="rounded-md bg-gray-50 p-4">
          <p className="text-2xl font-semibold">{results.finalTheta.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Ability estimate (θ)</p>
        </div>
      </div>

      <div className="w-full rounded-md border border-gray-200 p-4 text-left">
        <h2 className="mb-2 text-sm font-medium text-gray-900">AI summary</h2>
        <p className="text-sm text-gray-700">{results.aiSummary}</p>
      </div>

      <a href="/dashboard" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
        Back to dashboard
      </a>
    </main>
  );
}

export default function TestResultsPage() {
  return (
    <RequireAuth>
      <TestResultsPageContent />
    </RequireAuth>
  );
}
