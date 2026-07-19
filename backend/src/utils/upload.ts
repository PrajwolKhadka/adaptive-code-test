import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { AppError } from "../middlewares/errorHandler.middleware";

// Stored OUTSIDE any statically-served directory — files are only ever
// reachable through the authenticated /resources/:id/download controller,
// never via direct URL guessing or a static file server misconfiguration.
export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "resources");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    // Server-generated filename — NEVER the client-supplied original name.
    // Trusting a client filename is a path-traversal and overwrite vector
    // (e.g. "../../server.ts" or overwriting another resource's file by
    // guessing its stored name). The original name is kept separately in
    // the DB for display only, never used for filesystem paths.
    cb(null, `${crypto.randomUUID()}.pdf`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // Client-supplied mimetype is trivially spoofable — this is a first,
  // cheap check, NOT the real defense. The real check is the magic-byte
  // verification in resource.service.ts after the file lands on disk.
  if (file.mimetype !== "application/pdf") {
    return cb(new AppError("Only PDF files are allowed.", 400));
  }
  cb(null, true);
}

export const pdfUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

/**
 * Verifies the uploaded file actually starts with the PDF magic bytes
 * (%PDF-1.x header). Client-supplied mimetype and file extension are both
 * trivially spoofable (rename a .exe to .pdf, or fake the Content-Type
 * header) — this is the real content-based validation. Deletes the file
 * and throws if the check fails, so nothing invalid stays on disk even
 * transiently.
 */
export function assertIsPdfOrCleanup(filePath: string): void {
  const fd = fs.openSync(filePath, "r");
  const header = Buffer.alloc(5);
  fs.readSync(fd, header, 0, 5, 0);
  fs.closeSync(fd);

  if (header.toString("ascii") !== "%PDF-") {
    fs.unlinkSync(filePath);
    throw new AppError("Uploaded file is not a valid PDF.", 400);
  }
}
