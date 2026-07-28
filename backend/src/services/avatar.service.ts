import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { Types } from "mongoose";
import { AppError } from "../middlewares/errorHandler.middleware";
import { UserRepository } from "../repositories/user.repository";
import { detectImageMimeFromBuffer } from "../utils/fileSignature";
import { logActivity } from "../utils/activityLogger";

const AVATAR_DIR = process.env.AVATAR_UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "avatars");
const MAX_DIMENSION = 512; // px — square, cropped

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

interface RequestContext {
  ip: string;
  userAgent: string;
}

export class AvatarService {
  private userRepo = new UserRepository();

  async upload(userId: Types.ObjectId, file: Express.Multer.File, ctx: RequestContext) {

    const sniffedMime = detectImageMimeFromBuffer(file.buffer);
    if (!sniffedMime) {
      throw new AppError("File is not a valid PNG or JPG image.", 400);
    }
    let processedBuffer: Buffer;
    let finalMime: "image/png" | "image/jpeg";
    try {
      const image = sharp(file.buffer, { failOn: "error" })
        .rotate() // normalize EXIF orientation before stripping it
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "cover", position: "attention" });

      if (sniffedMime === "image/png") {
        processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
        finalMime = "image/png";
      } else {
        processedBuffer = await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
        finalMime = "image/jpeg";
      }
    } catch {
      throw new AppError("Could not process image. The file may be corrupt.", 400);
    }

    await fs.mkdir(AVATAR_DIR, { recursive: true });

    const storedFileName = `${userId.toString()}_${crypto.randomUUID()}${EXT_BY_MIME[finalMime]}`;
    await fs.writeFile(path.join(AVATAR_DIR, storedFileName), processedBuffer);

    const previous = await this.userRepo.findById(userId);

    await this.userRepo.setAvatar(userId, {
      storedFileName,
      mimeType: finalMime,
      fileSizeBytes: processedBuffer.length,
    });

    if (previous?.avatar?.storedFileName) {
      await this.deleteFile(previous.avatar.storedFileName);
    }

    await logActivity({ userId, action: "avatar_uploaded", ip: ctx.ip, userAgent: ctx.userAgent });

    return { avatarUrl: `/uploads/avatars/${storedFileName}` };
  }

  async remove(userId: Types.ObjectId, ctx: RequestContext) {
    const user = await this.userRepo.findById(userId);
    if (!user?.avatar?.storedFileName) return;

    await this.deleteFile(user.avatar.storedFileName);
    await this.userRepo.clearAvatar(userId);
    await logActivity({ userId, action: "avatar_removed", ip: ctx.ip, userAgent: ctx.userAgent });
  }

  private async deleteFile(storedFileName: string) {
    await fs.unlink(path.join(AVATAR_DIR, storedFileName)).catch(() => {
      // Already missing on disk — don't let that block the DB update.
    });
  }
}