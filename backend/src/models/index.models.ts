/**
 * Data model design — Adaptive Code Solving Platform
 * MERN + TypeScript + Mongoose
 *
 * Design notes (for your report's "Design and Implementation" section):
 * - Difficulty is stored as an enum string but mapped to a numeric IRT scale
 *   (-2 .. +2) via difficultyMap, same pattern as your quiz platform.
 * - Test.questionPoolIds is snapshotted per-attempt (like your old
 *   setQuizQuestionPool) to prevent mid-test question changes = integrity control.
 * - SubmissionJob is a separate collection from Attempt so the sandboxed
 *   execution can be async/queued without blocking the request thread —
 *   this is also your natural rate-limiting choke point.
 * - EXP is never mutated directly on User; every change goes through
 *   ExpTransaction as an append-only ledger (this IS your "digital
 *   signature + rollback" transaction mechanism for section 2.4).
 */

import { Schema, model, Types } from "mongoose";

// ---------- Enums ----------

export enum Difficulty {
  VERY_EASY = "very_easy",
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
  VERY_HARD = "very_hard",
}

export const difficultyMap: Record<Difficulty, number> = {
  [Difficulty.VERY_EASY]: -2,
  [Difficulty.EASY]: -1,
  [Difficulty.MEDIUM]: 0,
  [Difficulty.HARD]: 1,
  [Difficulty.VERY_HARD]: 2,
};

export enum Role {
  STUDENT = "student",
  ADMIN = "admin",
}

export enum SubmissionStatus {
  QUEUED = "queued",
  RUNNING = "running",
  PASSED = "passed",
  FAILED = "failed",
  PARTIAL = "partial",
  ERROR = "error", // compile error, runtime crash
  TIMEOUT = "timeout",
  REJECTED = "rejected", // failed static pre-checks before even running
}

// ---------- User ----------

interface IUser {
  email: string;
  passwordHash: string; // argon2id
  passwordHistory: string[]; // last 5 hashes, for reuse prevention
  passwordChangedAt: Date;
  role: Role;
  mfaEnabled: boolean;
  mfaSecret?: string; // encrypted at rest
  failedLoginAttempts: number;
  lockedUntil?: Date;
  exp: number; // DERIVED/cached value only — source of truth is ExpTransaction ledger
  theta: number; // current IRT ability estimate, global or per-topic (see Test model note)
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passwordHistory: { type: [String], default: [], select: false },
    passwordChangedAt: { type: Date, default: Date.now },
    role: { type: String, enum: Object.values(Role), default: Role.STUDENT },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    exp: { type: Number, default: 0 },
    theta: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ---------- Question ----------

interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean; // hidden cases not shown to student, prevents gaming
  weight: number; // for partial credit
}

interface IQuestion {
  title: string;
  prompt: string;
  difficulty: Difficulty;
  language: "python"; // scoped to one language initially — see execution notes
  starterCode: string;
  testCases: ITestCase[];
  timeLimitMs: number; // per-execution timeout
  memoryLimitMb: number;
  hintCostExp: number;
  hints: string[]; // progressive hints, unlocked in order
  exposureCount: number; // times served — for exposure control in selection
  createdBy: Types.ObjectId; // admin
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    difficulty: { type: String, enum: Object.values(Difficulty), required: true },
    language: { type: String, default: "python" },
    starterCode: { type: String, default: "" },
    testCases: [
      {
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: true },
        weight: { type: Number, default: 1 },
      },
    ],
    timeLimitMs: { type: Number, default: 3000 },
    memoryLimitMb: { type: Number, default: 128 },
    hintCostExp: { type: Number, default: 10 },
    hints: { type: [String], default: [] },
    exposureCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ---------- Test (a "session" of 15 questions) ----------

interface ITest {
  studentId: Types.ObjectId;
  questionPoolIds: Types.ObjectId[]; // snapshotted at test start — integrity control
  status: "in_progress" | "completed" | "abandoned";
  thetaTrajectory: { afterQuestionIndex: number; theta: number }[];
  startedAt: Date;
  completedAt?: Date;
  aiSummary?: string;
}

const testSchema = new Schema<ITest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionPoolIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    status: { type: String, enum: ["in_progress", "completed", "abandoned"], default: "in_progress" },
    thetaTrajectory: [
      {
        afterQuestionIndex: Number,
        theta: Number,
      },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    aiSummary: { type: String },
  },
  { timestamps: true },
);

// ---------- Attempt (one question within a Test) ----------

interface IAttempt {
  testId: Types.ObjectId;
  studentId: Types.ObjectId;
  questionId: Types.ObjectId;
  difficultyAtAttempt: Difficulty; // snapshot — question difficulty could change later via admin edit or recalibration
  submittedCode: string;
  testCaseResults: { passed: boolean; weight: number }[];
  effectiveCorrectness: number; // 0..1, discounted for hints used (see below)
  hintsUsed: number;
  thetaBefore: number;
  thetaAfter: number;
  timeTakenMs: number;
  createdAt: Date;
}

const attemptSchema = new Schema<IAttempt>(
  {
    testId: { type: Schema.Types.ObjectId, ref: "Test", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    difficultyAtAttempt: { type: String, enum: Object.values(Difficulty), required: true },
    submittedCode: { type: String, required: true },
    testCaseResults: [{ passed: Boolean, weight: Number }],
    effectiveCorrectness: { type: Number, required: true },
    hintsUsed: { type: Number, default: 0 },
    thetaBefore: { type: Number, required: true },
    thetaAfter: { type: Number, required: true },
    timeTakenMs: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
// Enforce one attempt per (student, test, question) at the DB level —
// prevents the resubmission race condition your old quiz platform guarded
// against only in application code.
attemptSchema.index({ testId: 1, questionId: 1 }, { unique: true });

// ---------- SubmissionJob (async sandboxed execution queue) ----------

interface ISubmissionJob {
  attemptId?: Types.ObjectId; // set once attempt is finalized
  studentId: Types.ObjectId;
  questionId: Types.ObjectId;
  code: string;
  status: SubmissionStatus;
  result?: { passed: boolean; weight: number; stdout?: string; stderr?: string }[];
  errorMessage?: string;
  requestedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

const submissionJobSchema = new Schema<ISubmissionJob>({
  attemptId: { type: Schema.Types.ObjectId, ref: "Attempt" },
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
  code: { type: String, required: true },
  status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.QUEUED },
  result: [{ passed: Boolean, weight: Number, stdout: String, stderr: String }],
  errorMessage: { type: String },
  requestedAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  finishedAt: { type: Date },
});

// ---------- ExpTransaction (append-only ledger — the "2.4 transaction" control) ----------

interface IExpTransaction {
  studentId: Types.ObjectId;
  type: "earn" | "spend";
  amount: number;
  reason: "attempt_correct" | "hint_purchase" | "admin_adjustment";
  relatedAttemptId?: Types.ObjectId;
  relatedQuestionId?: Types.ObjectId;
  balanceAfter: number; // snapshot for auditability
  signature: string; // HMAC over {studentId, type, amount, reason, balanceAfter, timestamp}
  createdAt: Date;
}

const expTransactionSchema = new Schema<IExpTransaction>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["earn", "spend"], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ["attempt_correct", "hint_purchase", "admin_adjustment"], required: true },
    relatedAttemptId: { type: Schema.Types.ObjectId, ref: "Attempt" },
    relatedQuestionId: { type: Schema.Types.ObjectId, ref: "Question" },
    balanceAfter: { type: Number, required: true },
    signature: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// ---------- ActivityLog (2.5 logging/monitoring) ----------

interface IActivityLog {
  userId?: Types.ObjectId;
  action: string; // e.g. "login_failed", "hint_purchased", "admin_question_deleted"
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>; // never store secrets/PII here
  severity: "info" | "warn" | "alert";
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true, index: true },
    ip: { type: String, required: true },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    severity: { type: String, enum: ["info", "warn", "alert"], default: "info" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel = model<IUser>("User", userSchema);
export const QuestionModel = model<IQuestion>("Question", questionSchema);
export const TestModel = model<ITest>("Test", testSchema);
export const AttemptModel = model<IAttempt>("Attempt", attemptSchema);
export const SubmissionJobModel = model<ISubmissionJob>("SubmissionJob", submissionJobSchema);
export const ExpTransactionModel = model<IExpTransaction>("ExpTransaction", expTransactionSchema);
export const ActivityLogModel = model<IActivityLog>("ActivityLog", activityLogSchema);
