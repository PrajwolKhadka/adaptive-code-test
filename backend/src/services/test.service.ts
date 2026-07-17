import { Types } from "mongoose";
import { TestRepository } from "../repositories/test.repository";
import { AttemptRepository } from "../repositories/attempt.repository";
import { QuestionRepository } from "../repositories/question.repository";
import { UserRepository } from "../repositories/user.repository";
import { QuestionService } from "./question.service";
import { AiSummaryService } from "./aiSummary.service";
import { runAgainstTestCases } from "./execution.service";
import { ExpLedger } from "../utils/expLedger";
import { computeEffectiveCorrectness, updateTheta, selectNextItem } from "../utils/irt";
import { AppError } from "../middlewares/errorHandler.middleware";
import { logActivity } from "../utils/activityLogger";
import { Difficulty, UserModel } from "../models/index.models";
import { SubmitAttemptDTO } from "../dtos/test.dto";

const QUESTIONS_PER_TEST = 15;
const TIERS = [Difficulty.VERY_EASY, Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, Difficulty.VERY_HARD];
const PER_TIER = Math.floor(QUESTIONS_PER_TEST / TIERS.length); // 3 each
const EXP_PER_CORRECT_ANSWER = 20;

interface Ctx {
  ip: string;
  userAgent: string;
}

export class TestService {
  private testRepo = new TestRepository();
  private attemptRepo = new AttemptRepository();
  private questionRepo = new QuestionRepository();
  private userRepo = new UserRepository();
  private questionService = new QuestionService();
  private aiSummaryService = new AiSummaryService();
  private expLedger = new ExpLedger();

  async startTest(studentId: Types.ObjectId, ctx: Ctx) {
    // Stratified pool build: 3 questions per difficulty tier = 15 total,
    // matching your bin-density plan exactly, no "remaining fill" fallback
    // needed since PER_TIER * TIERS.length === QUESTIONS_PER_TEST.
    const poolIds: Types.ObjectId[] = [];

    for (const tier of TIERS) {
      const available = await this.questionRepo.findActiveByDifficulty(tier);
      if (available.length < PER_TIER) {
        throw new AppError(`Not enough active questions at difficulty "${tier}" to start a test.`, 500);
      }
      const shuffled = [...available].sort(() => Math.random() - 0.5).slice(0, PER_TIER);
      for (const q of shuffled) {
        poolIds.push(q._id as Types.ObjectId);
        await this.questionRepo.incrementExposure(q._id as Types.ObjectId);
      }
    }

    const test = await this.testRepo.create(studentId, poolIds);
    await logActivity({ userId: studentId, action: "test_started", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { testId: test._id } });
    return { testId: test._id };
  }

  async getNextQuestion(testId: string, studentId: Types.ObjectId) {
    const test = await this.testRepo.findByIdForStudent(testId, studentId);
    if (!test) throw new AppError("Test not found.", 404);
    if (test.status !== "in_progress") throw new AppError("Test is not in progress.", 400);

    const answeredIds = await this.attemptRepo.answeredQuestionIds(test._id as Types.ObjectId);
    const answeredSet = new Set(answeredIds.map((id) => id.toString()));

    const remainingIds = test.questionPoolIds.filter((id) => !answeredSet.has(id.toString()));
    if (remainingIds.length === 0) {
      return { done: true };
    }

    const remainingQuestions = await this.questionRepo.findManyByIds(remainingIds);
    const user = await this.userRepo.findById(studentId);
    if (!user) throw new AppError("User not found.", 404);

    const nextQuestion = selectNextItem<any>(remainingQuestions as any[], user.theta);
    const hintsPurchased = await this.expLedger.countHintsPurchased(studentId, test._id as Types.ObjectId, nextQuestion._id as Types.ObjectId);

    const view = await this.questionService.getForStudent((nextQuestion._id as Types.ObjectId).toString(), hintsPurchased);
    return {
      done: false,
      question: view,
      progress: { answered: answeredSet.size, total: test.questionPoolIds.length },
    };
  }

  async purchaseHint(testId: string, studentId: Types.ObjectId, questionId: string, ctx: Ctx) {
    const test = await this.testRepo.findByIdForStudent(testId, studentId);
    if (!test) throw new AppError("Test not found.", 404);

    const questionObjectId = new Types.ObjectId(questionId);
    // Ownership check: the question must actually be part of THIS test's
    // snapshotted pool — prevents buying hints for arbitrary question IDs
    // outside the student's assigned set.
    const inPool = test.questionPoolIds.some((id) => id.toString() === questionId);
    if (!inPool) throw new AppError("Question is not part of this test.", 403);

    const question = await this.questionRepo.findById(questionId);
    if (!question) throw new AppError("Question not found.", 404);

    const alreadyPurchased = await this.expLedger.countHintsPurchased(studentId, test._id as Types.ObjectId, questionObjectId);
    if (alreadyPurchased >= question.hints.length) {
      throw new AppError("No more hints available for this question.", 400);
    }

    const { balanceAfter } = await this.expLedger.spend({
      studentId,
      amount: question.hintCostExp,
      reason: "hint_purchase",
      relatedQuestionId: questionObjectId,
      relatedTestId: test._id as Types.ObjectId,
    });

    await logActivity({ userId: studentId, action: "hint_purchased", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { questionId, testId } });
    return { balanceAfter, unlockedHint: question.hints[alreadyPurchased] };
  }

  async submitAttempt(testId: string, studentId: Types.ObjectId, dto: SubmitAttemptDTO, ctx: Ctx) {
    const test = await this.testRepo.findByIdForStudent(testId, studentId);
    if (!test) throw new AppError("Test not found.", 404);
    if (test.status !== "in_progress") throw new AppError("Test is not in progress.", 400);

    const inPool = test.questionPoolIds.some((id) => id.toString() === dto.questionId);
    if (!inPool) throw new AppError("Question is not part of this test.", 403);

    const alreadyAnswered = await this.attemptRepo.hasAnswered(test._id as Types.ObjectId, new Types.ObjectId(dto.questionId));
    if (alreadyAnswered) throw new AppError("Question already answered.", 400);

    const question = await this.questionRepo.findById(dto.questionId);
    if (!question) throw new AppError("Question not found.", 404);

    const testCaseResults = await runAgainstTestCases(
      dto.code,
      question.testCases.map((tc: any) => ({ input: tc.input, expectedOutput: tc.expectedOutput, weight: tc.weight })),
      question.timeLimitMs,
    );

    const questionObjectId = new Types.ObjectId(dto.questionId);
    const hintsUsed = await this.expLedger.countHintsPurchased(studentId, test._id as Types.ObjectId, questionObjectId);
    const effectiveCorrectness = computeEffectiveCorrectness(testCaseResults, hintsUsed);

    const user = await this.userRepo.findById(studentId);
    if (!user) throw new AppError("User not found.", 404);

    const thetaBefore = user.theta;
    const thetaAfter = updateTheta(thetaBefore, question.difficulty, effectiveCorrectness);

    const attempt = await this.attemptRepo.create({
      testId: test._id,
      studentId,
      questionId: questionObjectId,
      difficultyAtAttempt: question.difficulty,
      submittedCode: dto.code,
      testCaseResults: testCaseResults.map((r) => ({ passed: r.passed, weight: r.weight })),
      effectiveCorrectness,
      hintsUsed,
      thetaBefore,
      thetaAfter,
      timeTakenMs: dto.timeTakenMs,
    });

    await UserModel.updateOne({ _id: studentId }, { theta: thetaAfter });

    const answeredSoFar = (await this.attemptRepo.answeredQuestionIds(test._id as Types.ObjectId)).length;
    await this.testRepo.appendThetaPoint(test._id as Types.ObjectId, answeredSoFar, thetaAfter);

    const isFullyCorrect = effectiveCorrectness >= 0.999; // all weighted test cases passed, no hint discount
    if (isFullyCorrect) {
      await this.expLedger.earn({
        studentId,
        amount: EXP_PER_CORRECT_ANSWER,
        reason: "attempt_correct",
        relatedAttemptId: attempt._id as Types.ObjectId,
      });
    }

    await logActivity({
      userId: studentId,
      action: "attempt_submitted",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { testId, questionId: dto.questionId, effectiveCorrectness },
    });

    return {
      passed: isFullyCorrect,
      effectiveCorrectness,
      testCaseResults: testCaseResults.map((r) => ({ passed: r.passed })), // don't leak stdout/stderr of hidden cases back to client
      thetaAfter,
    };
  }

  async finalizeTest(testId: string, studentId: Types.ObjectId, ctx: Ctx) {
    const test = await this.testRepo.findByIdForStudent(testId, studentId);
    if (!test) throw new AppError("Test not found.", 404);
    if (test.status === "completed") throw new AppError("Test already completed.", 400);

    const attempts = await this.attemptRepo.findByTest(test._id as Types.ObjectId);
    const correctCount = attempts.filter((a: any) => a.effectiveCorrectness >= 0.999).length;
    const hintsUsedTotal = attempts.reduce((sum: number, a: any) => sum + a.hintsUsed, 0);
    const finalTheta = attempts.length > 0 ? attempts[attempts.length - 1].thetaAfter : 0;

    const aiSummary = await this.aiSummaryService.generateSummary({
      totalQuestions: attempts.length,
      correctCount,
      finalTheta,
      thetaTrajectory: test.thetaTrajectory,
      hintsUsedTotal,
    });

    await this.testRepo.complete(test._id as Types.ObjectId, aiSummary);
    await logActivity({ userId: studentId, action: "test_completed", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { testId } });

    return {
      totalQuestions: attempts.length,
      correctCount,
      finalTheta,
      aiSummary,
    };
  }
}
