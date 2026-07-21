import { Types } from "mongoose";
import { QuestionRepository } from "../repositories/question.repository";
import { CreateQuestionDTO, UpdateQuestionDTO } from "../dtos/question.dto";
import { AppError } from "../middlewares/errorHandler.middleware";
import { logActivity } from "../utils/activityLogger";

export class QuestionService {
  private repo = new QuestionRepository();

  async create(dto: CreateQuestionDTO, adminId: Types.ObjectId, ctx: { ip: string; userAgent: string }) {
    const question = await this.repo.create(dto, adminId);
    await logActivity({ userId: adminId, action: "admin_question_created", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { questionId: question._id } });
    return question;
  }

  async update(id: string, dto: UpdateQuestionDTO, adminId: Types.ObjectId, ctx: { ip: string; userAgent: string }) {
    const question = await this.repo.update(id, dto);
    if (!question) throw new AppError("Question not found.", 404);
    await logActivity({ userId: adminId, action: "admin_question_updated", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { questionId: id } });
    return question;
  }

  async delete(id: string, adminId: Types.ObjectId, ctx: { ip: string; userAgent: string }) {
    const question = await this.repo.softDelete(id);
    if (!question) throw new AppError("Question not found.", 404);
    await logActivity({ userId: adminId, action: "admin_question_deleted", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { questionId: id }, severity: "warn" });
    return question;
  }

  async bulkImport(questions: CreateQuestionDTO[], adminId: Types.ObjectId, ctx: { ip: string; userAgent: string }) {
    const created = await this.repo.insertMany(questions, adminId);
    await logActivity({
      userId: adminId,
      action: "admin_questions_bulk_imported",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { count: created.length },
    });
    return created;
  }

  listForAdmin(filter: any = {}) {
    return this.repo.listAll(filter);
  }

  async getByIdForAdmin(id: string) {
    const question = await this.repo.findById(id);
    if (!question) throw new AppError("Question not found.", 404);
    return question;
  }

  async getForStudent(id: string, hintsPurchased: number) {
    const question = await this.repo.findById(id);
    if (!question || !question.isActive) throw new AppError("Question not found.", 404);

    const visibleTestCases = question.testCases
      .filter((tc: any) => !tc.isHidden)
      .map((tc: any) => ({ input: tc.input, expectedOutput: tc.expectedOutput }));

    return {
      id: question._id,
      title: question.title,
      prompt: question.prompt,
      difficulty: question.difficulty,
      starterCode: question.starterCode,
      visibleTestCases,
      hiddenTestCaseCount: question.testCases.length - visibleTestCases.length,
      hintCostExp: question.hintCostExp,
      hintsAvailable: question.hints.length,
      unlockedHints: question.hints.slice(0, hintsPurchased),
    };
  }
}