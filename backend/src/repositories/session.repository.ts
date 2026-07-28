import { SessionModel } from "../models/index.models";
import { Types } from "mongoose";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class SessionRepository {
  create(data: { userId: Types.ObjectId; refreshTokenHash: string; userAgentHash: string; ip: string }) {
    return SessionModel.create({
      ...data,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });
  }

  findByTokenHash(refreshTokenHash: string) {
    return SessionModel.findOne({ refreshTokenHash });
  }
/**
   * Marks the old session as used and links it to the newly created session.
   * Implements refresh-token rotation: a token can be used only once.
   * If a stolen token is later presented, the chain shows it was already
   * replaced, allowing detection of reuse and forced logout.
   */
  async markUsedAndChain(sessionId: Types.ObjectId, newSessionId: Types.ObjectId) {
    await SessionModel.updateOne({ _id: sessionId }, { used: true, replacedBySessionId: newSessionId });
  }
/**
   * Revokes a single session (e.g. on logout).
   * Immediate server-side invalidation even if the access token has not yet
   * expired. The requireAuth middleware checks this flag on every request.
   */
  async revoke(sessionId: Types.ObjectId) {
    await SessionModel.updateOne({ _id: sessionId }, { revoked: true });
  }
/**
   * Revokes every session belonging to a user (password change, security
   * incident, “log out everywhere”). Ensures no lingering refresh tokens
   * can be used after a credential or policy change.
   */
  async revokeAllForUser(userId: Types.ObjectId) {
    await SessionModel.updateMany({ userId }, { revoked: true });
  }
}
