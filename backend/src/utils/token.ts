import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Role } from "../models/index.models";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  sid: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.verify(token, secret, { algorithms: ["HS256"] }) as AccessTokenPayload;
}


export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function hashUserAgent(userAgent: string): string {
  return crypto.createHash("sha256").update(userAgent || "unknown").digest("hex");
}

interface MfaChallengePayload {
  sub: string; // userId
  purpose: "mfa_challenge";
}

export function signMfaChallengeToken(userId: string): string {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.sign({ sub: userId, purpose: "mfa_challenge" } as MfaChallengePayload, secret, {
    expiresIn: "5m",
    algorithm: "HS256",
  });
}

export function verifyMfaChallengeToken(token: string): MfaChallengePayload {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] }) as MfaChallengePayload;
  if (payload.purpose !== "mfa_challenge") {
    throw new Error("Invalid token purpose");
  }
  return payload;
}
