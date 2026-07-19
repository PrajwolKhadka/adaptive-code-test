"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAdmin } from "@/components/RouteGuards";
import { QuestionForm } from "@/components/QuestionForm";
import { emptyQuestionForm } from "@/types/question";

function NewQuestionPageContent() {
  const router = useRouter();
  const [form, setForm] = useState(emptyQuestionForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiClient.post("/questions", form);
      router.push("/admin/questions");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold">New question</h1>
      <form onSubmit={handleSubmit}>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <QuestionForm value={form} onChange={setForm} />
        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create question"}
          </button>
          <a href="/admin/questions" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </form>
    </main>
  );
}

export default function NewQuestionPage() {
  return (
    <RequireAdmin>
      <NewQuestionPageContent />
    </RequireAdmin>
  );
}
