export interface StudentQuestionView {
  id: string;
  title: string;
  prompt: string;
  difficulty: string;
  starterCode: string;
  visibleTestCases: { input: string; expectedOutput: string }[];
  hiddenTestCaseCount: number;
  hintCostExp: number;
  hintsAvailable: number;
  unlockedHints: string[];
}

export interface NextQuestionResponse {
  done: boolean;
  question?: StudentQuestionView;
  progress?: { answered: number; total: number };
}

export interface SubmitAttemptResponse {
  passed: boolean;
  effectiveCorrectness: number;
  testCaseResults: { passed: boolean }[];
  thetaAfter: number;
}

export interface FinalizeResponse {
  totalQuestions: number;
  correctCount: number;
  finalTheta: number;
  aiSummary: string;
}
