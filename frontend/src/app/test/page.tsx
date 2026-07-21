"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAuth } from "@/components/RouteGuards";

function StartTestPageContent() {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);
    try {
      const res = await apiClient.post("/tests");
      const testId = res.data.data.testId;
      router.push(`/test/${testId}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStarting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Ready for a test?</h1>
      <p className="max-w-md text-sm text-gray-600">
        15 questions, difficulty adapts to how you're doing as you go. Earn EXP for correct answers, spend it on
        hints if you get stuck.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleStart}
        disabled={starting}
        className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {starting ? "Starting…" : "Start test"}
      </button>
    </main>
  );
}

export default function StartTestPage() {
  return (
    <RequireAuth>
      <StartTestPageContent />
    </RequireAuth>
  );
}
