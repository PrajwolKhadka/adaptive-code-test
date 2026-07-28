import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Role } from "../models/index.models";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  sid: string;
}
/**
 * Signs a short-lived access token (JWT) containing user id, role, and session id.
 * Uses HS256 with a server-only secret. Short expiry (default 15m) limits the
 * damage if a token is stolen. The session id (sid) lets us revoke access
 * server-side even before the JWT expires.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m") as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}
/**
 * Verifies an access token’s signature and expiry.
 * Explicitly restricts the algorithm to HS256 to prevent algorithm-confusion
 * attacks. Throws on invalid/expired tokens so callers can reject the request.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  return jwt.verify(token, secret, { algorithms: ["HS256"] }) as AccessTokenPayload;
}
/**
 * Generates a high-entropy opaque refresh token (64 random bytes, base64url).
 * Not a JWT — it is a pure random string that must be looked up / hashed
 * server-side. This avoids the risks of long-lived JWTs and makes theft
 * detection + revocation straightforward.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("base64url");
}
/**
 * Hashes a refresh token with SHA-256 before storage.
 * Even if the database is leaked, the raw refresh tokens remain unusable.
 * Only the hash is stored; the original token is sent to the client once
 * and never written to the DB in plaintext.
 */
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
