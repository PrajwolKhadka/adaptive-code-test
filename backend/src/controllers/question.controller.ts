import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { QuestionService } from "../services/question.service";
import { bulkImportQuestionsSchema } from "../dtos/question.dto";

const questionService = new QuestionService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const questionController = {
  async bulkImport(req: Request, res: Response, next: NextFunction) {
    try {
      const result = bulkImportQuestionsSchema.safeParse(req.body);

      if (!result.success) {
        const errorsByIndex = new Map<number, string[]>();
        for (const issue of result.error.issues) {
          const index = typeof issue.path[0] === "number" ? issue.path[0] : -1;
          const fieldPath = issue.path.slice(1).join(".");
          const message = fieldPath ? `${fieldPath}: ${issue.message}` : issue.message;
          const existing = errorsByIndex.get(index) ?? [];
          existing.push(message);
          errorsByIndex.set(index, existing);
        }

        const details = Array.from(errorsByIndex.entries()).map(([index, errors]) => ({ index, errors }));
        return res.status(400).json({
          success: false,
          message: `${details.length} question(s) failed validation. Nothing was imported — fix these and re-upload.`,
          details,
        });
      }

      const created = await questionService.bulkImport(result.data, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(201).json({ success: true, data: { importedCount: created.length } });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const q = await questionService.create(req.body, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(201).json({ success: true, data: q });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const q = await questionService.update(req.params.id, req.body, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(200).json({ success: true, data: q });
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await questionService.delete(req.params.id, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async listAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const questions = await questionService.listForAdmin();
      res.status(200).json({ success: true, data: questions });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const question = await questionService.getByIdForAdmin(req.params.id);
      res.status(200).json({ success: true, data: question });
    } catch (err) {
      next(err);
    }
  },
};