import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { ResourceService } from "../services/resource.service";
import { AppError } from "../middlewares/errorHandler.middleware";

const resourceService = new ResourceService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const resourceController = {
  async createVideo(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, description, url } = req.body;
      const resource = await resourceService.createVideo(title, description, url, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(201).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  },

  async createPdf(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError("No file uploaded.", 400);
      const { title, description } = req.body;
      const resource = await resourceService.createPdf(title, description ?? "", req.file, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(201).json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const resources = req.user!.role === "admin" ? await resourceService.listForAdmin() : await resourceService.listForUser();
      res.status(200).json({ success: true, data: resources });
    } catch (err) {
      next(err);
    }
  },

  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, downloadName } = await resourceService.getFilePathForDownload(req.params.id);
      res.download(filePath, downloadName);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await resourceService.delete(req.params.id, new Types.ObjectId(req.user!.id), getCtx(req));
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
