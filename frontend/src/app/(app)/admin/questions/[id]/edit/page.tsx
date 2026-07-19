"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAdmin } from "@/components/RouteGuards";
import { QuestionForm } from "@/components/QuestionForm";
import { QuestionFormValues, emptyQuestionForm } from "@/types/question";

function EditQuestionPageContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<QuestionFormValues>(emptyQuestionForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get(`/questions/${params.id}`)
      .then((res) => {
        const q = res.data.data;
        setForm({
          title: q.title,
          prompt: q.prompt,
          difficulty: q.difficulty,
          starterCode: q.starterCode,
          testCases: q.testCases,
          timeLimitMs: q.timeLimitMs,
          memoryLimitMb: q.memoryLimitMb,
          hintCostExp: q.hintCostExp,
          hints: q.hints,
        });
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.patch(`/questions/${params.id}`, form);
      router.push("/admin/questions");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">Edit question</h1>
      <form onSubmit={handleSubmit}>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <QuestionForm value={form} onChange={setForm} />
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <a href="/admin/questions" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

export default function EditQuestionPage() {
  return (
    <RequireAdmin>
      <EditQuestionPageContent />
    </RequireAdmin>
  );
}
