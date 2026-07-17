import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./errorHandler.middleware";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(" ");
      return next(new AppError(message, 400));
    }
    req.body = result.data;
    next();
  };
}
