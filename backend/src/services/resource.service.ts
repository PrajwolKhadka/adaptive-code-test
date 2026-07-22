import { Types } from "mongoose";
import fs from "fs";
import path from "path";
import { ResourceRepository } from "../repositories/resource.repository";
import { extractYoutubeId } from "../utils/youtube";
import { assertIsPdfOrCleanup, UPLOAD_DIR } from "../utils/upload";
import { AppError } from "../middlewares/errorHandler.middleware";
import { logActivity } from "../utils/activityLogger";
import { ResourceType } from "../models/index.models";

interface Ctx {
  ip: string;
  userAgent: string;
}

export class ResourceService {
  private repo = new ResourceRepository();

  async createVideo(title: string, description: string, url: string, adminId: Types.ObjectId, ctx: Ctx) {
    const youtubeVideoId = extractYoutubeId(url);
    const resource = await this.repo.createVideo({ title, description, youtubeVideoId, uploadedBy: adminId });
    await logActivity({ userId: adminId, action: "admin_resource_video_added", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { resourceId: resource._id } });
    return resource;
  }

  async createPdf(
    title: string,
    description: string,
    file: Express.Multer.File,
    adminId: Types.ObjectId,
    ctx: Ctx,
  ) {
    assertIsPdfOrCleanup(file.path); // throws + deletes the file if the content isn't really a PDF

    const resource = await this.repo.createPdf({
      title,
      description,
      storedFileName: file.filename,
      originalFileName: file.originalname,
      fileSizeBytes: file.size,
      uploadedBy: adminId,
    });
    await logActivity({ userId: adminId, action: "admin_resource_pdf_uploaded", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { resourceId: resource._id } });
    return resource;
  }

  listForUser() {
    return this.repo.listActive();
  }

  listForAdmin() {
    return this.repo.listAllForAdmin();
  }

  async getFilePathForDownload(resourceId: string): Promise<{ filePath: string; downloadName: string }> {
    const resource = await this.repo.findById(resourceId);
    if (!resource || !resource.isActive || resource.type !== ResourceType.PDF || !resource.storedFileName) {
      throw new AppError("Resource not found.", 404);
    }

    // storedFileName is always a server-generated UUID (see utils/upload.ts)
    // and path.resolve here can never escape UPLOAD_DIR since there are no
    // path separators possible in a UUID — defense in depth against path
    // traversal even though the filename is already trusted.
    const filePath = path.resolve(UPLOAD_DIR, resource.storedFileName);
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
      throw new AppError("Invalid resource path.", 400);
    }
    if (!fs.existsSync(filePath)) {
      throw new AppError("File no longer available.", 404);
    }

    return { filePath, downloadName: resource.originalFileName ?? "document.pdf" };
  }

  async delete(resourceId: string, adminId: Types.ObjectId, ctx: Ctx) {
    const resource = await this.repo.softDelete(resourceId);
    if (!resource) throw new AppError("Resource not found.", 404);
    await logActivity({ userId: adminId, action: "admin_resource_deleted", ip: ctx.ip, userAgent: ctx.userAgent, metadata: { resourceId }, severity: "warn" });
    return resource;
  }
}
