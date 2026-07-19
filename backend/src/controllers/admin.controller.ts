import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { AdminService } from "../services/admin.service";

const adminService = new AdminService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const adminController = {
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getOverview();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async performance(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getPerformanceCharts();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.listStudents();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      await adminService.deleteUser(req.params.id, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
