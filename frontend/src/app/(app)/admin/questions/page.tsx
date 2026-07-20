"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { RequireAdmin } from "@/components/RouteGuards";
import { AdminQuestion } from "@/types/question";

interface ImportErrorDetail {
  index: number;
  errors: string[];
}

const TEMPLATE = [
  {
    title: "Sum of two numbers",
    prompt: "Read two space-separated integers from stdin and print their sum.",
    difficulty: "very_easy",
    starterCode: "a, b = map(int, input().split())\nprint(a + b)",
    testCases: [
      { input: "2 3", expectedOutput: "5", isHidden: false, weight: 1 },
      { input: "10 -4", expectedOutput: "6", isHidden: true, weight: 1 },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    hintCostExp: 5,
    hints: ["Split the input line on whitespace.", "Convert both parts to int before adding."],
  },
  {
    title: "Reverse a string",
    prompt: "Read a single line and print it reversed.",
    difficulty: "easy",
    starterCode: "s = input()\nprint(s[::-1])",
    testCases: [
      { input: "hello", expectedOutput: "olleh", isHidden: false, weight: 1 },
      { input: "racecar", expectedOutput: "racecar", isHidden: true, weight: 1 },
    ],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    hintCostExp: 5,
    hints: ["Python slicing with a step of -1 reverses a sequence."],
  },
];

function AdminQuestionsPageContent() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<ImportErrorDetail[] | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function downloadTemplate() {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-import-template.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors(null);
    setImportSuccess(null);
    setError(null);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setError("That file isn't valid JSON.");
        return;
      }

      const res = await apiClient.post("/questions/bulk-import", parsed);
      setImportSuccess(`Imported ${res.data.data.importedCount} question(s).`);
      load();
    } catch (err: any) {
      const details = err?.response?.data?.details;
      if (details) {
        setImportErrors(details);
        setError(err.response.data.message);
      } else {
        setError(getApiErrorMessage(err));
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Questions</h1>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Download template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {importing ? "Importing…" : "Bulk import (JSON)"}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelected} className="hidden" />
          <a href="/admin/questions/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            + New question
          </a>
        </div>
      </div>

      {importSuccess && <p className="mb-4 text-sm text-green-700">{importSuccess}</p>}
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {importErrors && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
          <ul className="space-y-1 text-xs text-red-700">
            {importErrors.map((d) => (
              <li key={d.index}>
                <strong>Question {d.index + 1}:</strong> {d.errors.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && questions.length === 0 && (
        <p className="text-sm text-gray-500">
          No questions yet. Download the template above for the exact JSON shape, or create one manually.
        </p>
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