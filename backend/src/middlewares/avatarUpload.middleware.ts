import multer from "multer";
import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.middleware";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg"]);
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3MB, pre-processing

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(getExtension(file.originalname))) {
      cb(new AppError("Only PNG or JPG images are allowed.", 400));
      return;
    }
    cb(null, true);
  },
});

export function handleAvatarUpload(req: Request, res: Response, next: NextFunction) {
  avatarUpload.single("avatar")(req, res, (err: unknown) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return next(new AppError("Image must be 3MB or smaller.", 400));
    }
    return next(err instanceof AppError ? err : new AppError("Invalid file upload.", 400));
  });
}