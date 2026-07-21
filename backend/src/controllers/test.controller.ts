import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { TestService } from "../services/test.service";

const testService = new TestService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const testController = {
  async stats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await testService.getStudentStats(new Types.ObjectId(req.user!.id));
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
},
  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testService.startTest(new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async nextQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testService.getNextQuestion(req.params.testId, new Types.ObjectId(req.user!.id));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async purchaseHint(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testService.purchaseHint(req.params.testId, new Types.ObjectId(req.user!.id), req.body.questionId, getCtx(req));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async submitAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testService.submitAttempt(req.params.testId, new Types.ObjectId(req.user!.id), req.body, getCtx(req));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async finalize(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await testService.finalizeTest(req.params.testId, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
