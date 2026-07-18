import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { QuestionService } from "../services/question.service";

const questionService = new QuestionService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const questionController = {
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
