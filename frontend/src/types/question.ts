export const DIFFICULTIES = ["very_easy", "easy", "medium", "hard", "very_hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

export interface QuestionFormValues {
  title: string;
  prompt: string;
  difficulty: Difficulty;
  starterCode: string;
  testCases: TestCaseInput[];
  timeLimitMs: number;
  memoryLimitMb: number;
  hintCostExp: number;
  hints: string[];
}

export interface AdminQuestion extends QuestionFormValues {
  _id: string;
  isActive: boolean;
  exposureCount: number;
  createdAt: string;
}

export function emptyQuestionForm(): QuestionFormValues {
  return {
    title: "",
    prompt: "",
    difficulty: "medium",
    starterCode: "",
    testCases: [{ input: "", expectedOutput: "", isHidden: true, weight: 1 }],
    timeLimitMs: 3000,
    memoryLimitMb: 128,
    hintCostExp: 10,
    hints: [],
  };
}
