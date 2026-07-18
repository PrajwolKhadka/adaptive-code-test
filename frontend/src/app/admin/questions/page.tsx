"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAdmin } from "@/components/RouteGuards";
import { AdminQuestion } from "@/types/question";

function AdminQuestionsPageContent() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/questions");
      setQuestions(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this question? (soft delete — existing attempts referencing it are preserved)")) return;
    try {
      await apiClient.delete(`/questions/${id}`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Questions</h1>
        <a href="/admin/questions/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          + New question
        </a>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && questions.length === 0 && (
        <p className="text-sm text-gray-500">No questions yet. Create one to get started.</p>
      )}

      <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
        {questions.map((q) => (
          <div key={q._id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {q.title} {!q.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
              </p>
              <p className="text-xs text-gray-500">
                {q.difficulty.replace("_", " ")} · {q.testCases.length} test case(s) · shown {q.exposureCount}×
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <a href={`/admin/questions/${q._id}/edit`} className="text-gray-700 underline">
                Edit
              </a>
              <button onClick={() => handleDelete(q._id)} className="text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function AdminQuestionsPage() {
  return (
    <RequireAdmin>
      <AdminQuestionsPageContent />
    </RequireAdmin>
  );
}
