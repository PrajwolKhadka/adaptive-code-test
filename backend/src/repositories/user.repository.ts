import { UserModel } from "../models/index.models";
import { Types } from "mongoose";

export class UserRepository {
  findByEmail(email: string, withSecrets = false) {
    const query = UserModel.findOne({ email: email.toLowerCase().trim() });
    if (withSecrets) {
      query.select("+passwordHash +passwordHistory +mfaSecret");
    }
    return query;
  }

  findById(id: string | Types.ObjectId, withSecrets = false) {
    const query = UserModel.findById(id);
    if (withSecrets) {
      query.select("+passwordHash +passwordHistory +mfaSecret");
    }
    return query;
  }

  create(data: { email: string; passwordHash: string; passwordHistory: string[] }) {
    return UserModel.create(data);
  }

  async incrementFailedAttempts(userId: Types.ObjectId, lockThreshold: number, lockDurationMs: number) {
    const user = await UserModel.findById(userId);
    if (!user) return;

    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= lockThreshold) {
      user.lockedUntil = new Date(Date.now() + lockDurationMs);
      user.failedLoginAttempts = 0; // reset counter once locked, so unlocking starts fresh
    }
    await user.save();
    return user;
  }

  async resetFailedAttempts(userId: Types.ObjectId) {
    await UserModel.updateOne({ _id: userId }, { failedLoginAttempts: 0, lockedUntil: undefined });
  }

  async updatePassword(userId: Types.ObjectId, passwordHash: string, passwordHistory: string[]) {
    await UserModel.updateOne(
      { _id: userId },
      { passwordHash, passwordHistory, passwordChangedAt: new Date() },
    );
  }

  async setMfaSecret(userId: Types.ObjectId, encryptedSecret: string) {
    await UserModel.updateOne({ _id: userId }, { mfaSecret: encryptedSecret });
  }

  async enableMfa(userId: Types.ObjectId) {
    await UserModel.updateOne({ _id: userId }, { mfaEnabled: true });
  }
}
