// import multer from "multer";
// import crypto from "crypto";
// import path from "path";
// import fs from "fs";
// import { AppError } from "../middlewares/errorHandler.middleware";
// import pdfParse from "pdf-parse";

// export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "resources");
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
//   filename: (_req, _file, cb) => {
//     cb(null, `${crypto.randomUUID()}.pdf`);
//   },
// });
// function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
//   if (file.mimetype !== "application/pdf") {
//     return cb(new AppError("Only PDF files are allowed.", 400));
//   }
//   cb(null, true);
// }

// export const pdfUpload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
// });
// export function assertIsPdfOrCleanup(filePath: string): void {
//   const fd = fs.openSync(filePath, "r");
//   const header = Buffer.alloc(5);
//   fs.readSync(fd, header, 0, 5, 0);
//   fs.closeSync(fd);

//   if (header.toString("ascii") !== "%PDF-") {
//     fs.unlinkSync(filePath);
//     throw new AppError("Uploaded file is not a valid PDF.", 400);
//   }
// }
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { AppError } from "../middlewares/errorHandler.middleware";
const pdfParse = require("pdf-parse");
export const UPLOAD_DIR = path.join(process.cwd(), "uploads", "resources");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    cb(null, `${crypto.randomUUID()}.pdf`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
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
 * Verifies the uploaded file starts with the PDF magic bytes (%PDF-)
 * AND has a parseable internal structure. The magic-byte check alone
 * accepts a valid header followed by garbage — pdf-parse walks the
 * actual xref table / page tree to catch that gap.
 */
export async function assertIsPdfOrCleanup(filePath: string): Promise<void> {
  const fd = fs.openSync(filePath, "r");
  const header = Buffer.alloc(5);
  fs.readSync(fd, header, 0, 5, 0);
  fs.closeSync(fd);

  if (header.toString("ascii") !== "%PDF-") {
    fs.unlinkSync(filePath);
    throw new AppError("Uploaded file is not a valid PDF.", 400);
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    if (!data || data.numpages < 1) {
      throw new Error("no pages");
    }
  } catch {
    fs.unlinkSync(filePath);
    throw new AppError("Uploaded file is not a valid PDF.", 400);
  }
}