"use client";

import { QuestionFormValues, DIFFICULTIES, TestCaseInput } from "@/types/question";

interface Props {
  value: QuestionFormValues;
  onChange: (value: QuestionFormValues) => void;
}

const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export function QuestionForm({ value, onChange }: Props) {
  function update<K extends keyof QuestionFormValues>(key: K, v: QuestionFormValues[K]) {
    onChange({ ...value, [key]: v });
  }

  function updateTestCase(index: number, patch: Partial<TestCaseInput>) {
    const next = [...value.testCases];
    next[index] = { ...next[index], ...patch };
    update("testCases", next);
  }

  function addTestCase() {
    update("testCases", [...value.testCases, { input: "", expectedOutput: "", isHidden: true, weight: 1 }]);
  }

  function removeTestCase(index: number) {
    update(
      "testCases",
      value.testCases.filter((_, i) => i !== index),
    );
  }

  function updateHint(index: number, text: string) {
    const next = [...value.hints];
    next[index] = text;
    update("hints", next);
  }

  function addHint() {
    update("hints", [...value.hints, ""]);
  }

  function removeHint(index: number) {
    update(
      "hints",
      value.hints.filter((_, i) => i !== index),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label className={labelClass}>Title</label>
        <input className={inputClass} value={value.title} onChange={(e) => update("title", e.target.value)} required />
      </div>

      <div>
        <label className={labelClass}>Prompt</label>
        <textarea
          className={inputClass}
          rows={6}
          value={value.prompt}
          onChange={(e) => update("prompt", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Difficulty</label>
          <select
            className={inputClass}
            value={value.difficulty}
            onChange={(e) => update("difficulty", e.target.value as QuestionFormValues["difficulty"])}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Hint cost (EXP)</label>
          <input
            type="number"
            className={inputClass}
            value={value.hintCostExp}
            onChange={(e) => update("hintCostExp", Number(e.target.value))}
            min={0}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Time limit (ms)</label>
          <input
            type="number"
            className={inputClass}
            value={value.timeLimitMs}
            onChange={(e) => update("timeLimitMs", Number(e.target.value))}
            min={500}
            max={10000}
          />
        </div>
        <div>
          <label className={labelClass}>Memory limit (MB)</label>
          <input
            type="number"
            className={inputClass}
            value={value.memoryLimitMb}
            onChange={(e) => update("memoryLimitMb", Number(e.target.value))}
            min={16}
            max={512}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Starter code</label>
        <textarea
          className={`${inputClass} font-mono`}
          rows={5}
          value={value.starterCode}
          onChange={(e) => update("starterCode", e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Hints (revealed in order, one EXP charge each)</label>
          <button type="button" onClick={addHint} className="text-sm text-gray-600 underline">
            + Add hint
          </button>
        </div>
        {value.hints.map((hint, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className={inputClass} value={hint} onChange={(e) => updateHint(i, e.target.value)} />
            <button type="button" onClick={() => removeHint(i)} className="text-sm text-red-600">
              Remove
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className={labelClass}>Test cases</label>
          <button type="button" onClick={addTestCase} className="text-sm text-gray-600 underline">
            + Add test case
          </button>
        </div>
        {value.testCases.map((tc, i) => (
          <div key={i} className="mb-3 rounded-md border border-gray-200 p-3">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Input (stdin)</label>
                <textarea
                  className={`${inputClass} font-mono`}
                  rows={2}
                  value={tc.input}
                  onChange={(e) => updateTestCase(i, { input: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Expected output</label>
                <textarea
                  className={`${inputClass} font-mono`}
                  rows={2}
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestCase(i, { expectedOutput: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateTestCase(i, { isHidden: e.target.checked })} />
                Hidden from student
              </label>
              <label className="flex items-center gap-1 text-xs text-gray-600">
                Weight:
                <input
                  type="number"
                  className="w-16 rounded border border-gray-300 px-1 py-0.5"
                  value={tc.weight}
                  onChange={(e) => updateTestCase(i, { weight: Number(e.target.value) })}
                  min={0}
                />
              </label>
              <button type="button" onClick={() => removeTestCase(i)} className="ml-auto text-xs text-red-600">
                Remove test case
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
