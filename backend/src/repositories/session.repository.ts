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

  async markUsedAndChain(sessionId: Types.ObjectId, newSessionId: Types.ObjectId) {
    await SessionModel.updateOne({ _id: sessionId }, { used: true, replacedBySessionId: newSessionId });
  }

  async revoke(sessionId: Types.ObjectId) {
    await SessionModel.updateOne({ _id: sessionId }, { revoked: true });
  }

  async revokeAllForUser(userId: Types.ObjectId) {
    await SessionModel.updateMany({ userId }, { revoked: true });
  }
}
