import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/token";
import { AppError } from "./errorHandler.middleware";
import { SessionModel, Role } from "../models/index.models";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; sessionId: string };
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;
  if (!token) return next(new AppError("Authentication required.", 401));

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new AppError("Invalid or expired session.", 401));
  }

  const session = await SessionModel.findById(payload.sid);
  if (!session || session.revoked) {
    return next(new AppError("Session has been revoked. Please log in again.", 401));
  }

  req.user = { id: payload.sub, role: payload.role, sessionId: payload.sid };
  next();
}
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError("Authentication required.", 401));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Insufficient permissions.", 403));
    }
    next();
  };
}
