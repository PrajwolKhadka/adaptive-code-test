import { Types } from "mongoose";
import { UserRepository } from "../repositories/user.repository";
import { SessionRepository } from "../repositories/session.repository";
import {
  hashPassword,
  verifyPassword,
  assertPasswordPolicy,
  isPasswordReused,
  pushPasswordHistory,
  isPasswordExpired,
} from "../utils/password";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  hashUserAgent,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
} from "../utils/token";
import { generateMfaSecret, buildOtpAuthUrl, verifyTotp } from "../utils/mfa";
import { verifyCaptcha } from "../utils/captcha";
import { logActivity } from "../utils/activityLogger";
import { AppError } from "../middlewares/errorHandler.middleware";
import { Role } from "../models/index.models";

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const CAPTCHA_TRIGGER_THRESHOLD = 3;

interface RequestContext {
  ip: string;
  userAgent: string;
}

export class AuthService {
  private userRepo = new UserRepository();
  private sessionRepo = new SessionRepository();

  async register(email: string, password: string, ctx: RequestContext) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new AppError("Unable to complete registration with the provided details.", 400);
    }

    assertPasswordPolicy(password, [email]);

    const passwordHash = await hashPassword(password);
    const user = await this.userRepo.create({
      email,
      passwordHash,
      passwordHistory: [passwordHash],
    });

    await logActivity({ userId: user._id as Types.ObjectId, action: "register", ip: ctx.ip, userAgent: ctx.userAgent });

    return { id: user._id, email: user.email };
  }


  //  Step 1 of login: verify credentials. Returns either a full session

  async login(email: string, password: string, captchaToken: string | undefined, ctx: RequestContext) {
    const user = await this.userRepo.findByEmail(email, true);

    const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmb3J0aW1pbmc";
    const passwordOk = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

    if (!user) {
      await logActivity({ action: "login_failed_unknown_email", ip: ctx.ip, userAgent: ctx.userAgent, severity: "warn" });
      throw new AppError("Invalid email or password.", 401);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "login_blocked_account_locked",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
      throw new AppError("Account temporarily locked due to repeated failed attempts.", 423);
    }

    // CAPTCHA
    if (user.failedLoginAttempts >= CAPTCHA_TRIGGER_THRESHOLD) {
      const captchaOk = await verifyCaptcha(captchaToken, ctx.ip);
      if (!captchaOk) {
        throw new AppError("CAPTCHA verification required.", 400);
      }
    }

    if (!passwordOk) {
      await this.userRepo.incrementFailedAttempts(user._id as Types.ObjectId, LOCK_THRESHOLD, LOCK_DURATION_MS);
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "login_failed_bad_password",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
      throw new AppError("Invalid email or password.", 401);
    }

    await this.userRepo.resetFailedAttempts(user._id as Types.ObjectId);

    if (isPasswordExpired(user.passwordChangedAt)) {
      throw new AppError("Password expired. Please reset your password to continue.", 403);
    }

    if (user.mfaEnabled) {
      const mfaChallengeToken = signMfaChallengeToken((user._id as Types.ObjectId).toString());
      await logActivity({ userId: user._id as Types.ObjectId, action: "login_password_ok_awaiting_mfa", ip: ctx.ip, userAgent: ctx.userAgent });
      return { mfaRequired: true as const, mfaChallengeToken };
    }

    const session = await this.issueSession(user._id as Types.ObjectId, user.role, ctx);
    await logActivity({ userId: user._id as Types.ObjectId, action: "login_success", ip: ctx.ip, userAgent: ctx.userAgent });
    return { mfaRequired: false as const, ...session };
  }

  async verifyMfaAndIssueSession(mfaChallengeToken: string, totpCode: string, ctx: RequestContext) {
    let payload;
    try {
      payload = verifyMfaChallengeToken(mfaChallengeToken);
    } catch {
      throw new AppError("MFA challenge expired or invalid. Please log in again.", 401);
    }

    const user = await this.userRepo.findById(payload.sub, true);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AppError("MFA is not configured for this account.", 400);
    }

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) {
      await logActivity({ userId: user._id as Types.ObjectId, action: "mfa_verify_failed", ip: ctx.ip, userAgent: ctx.userAgent, severity: "warn" });
      throw new AppError("Invalid authentication code.", 401);
    }

    const session = await this.issueSession(user._id as Types.ObjectId, user.role, ctx);
    await logActivity({ userId: user._id as Types.ObjectId, action: "mfa_verify_success", ip: ctx.ip, userAgent: ctx.userAgent });
    return session;
  }

  /** Issues a new access token + refresh token pair and persists the session. */
  private async issueSession(userId: Types.ObjectId, role: Role, ctx: RequestContext) {
    const refreshToken = generateRefreshToken();
    const session = await this.sessionRepo.create({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgentHash: hashUserAgent(ctx.userAgent),
      ip: ctx.ip,
    });

    const accessToken = signAccessToken({ sub: userId.toString(), role, sid: (session._id as Types.ObjectId).toString() });
    return { accessToken, refreshToken };
  }


  async refresh(refreshToken: string, ctx: RequestContext) {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new AppError("Invalid session.", 401);
    }

    if (session.revoked || session.used) {
      // Reuse of a dead token — assume compromise, nuke everything.
      await this.sessionRepo.revokeAllForUser(session.userId);
      await logActivity({
        userId: session.userId,
        action: "refresh_token_reuse_detected",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "alert",
      });
      throw new AppError("Session invalid. Please log in again.", 401);
    }

    if (session.expiresAt < new Date()) {
      throw new AppError("Session expired. Please log in again.", 401);
    }
    if (session.userAgentHash !== hashUserAgent(ctx.userAgent)) {
      await logActivity({
        userId: session.userId,
        action: "refresh_device_mismatch",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "alert",
      });
    }

    const user = await this.userRepo.findById(session.userId);
    if (!user) throw new AppError("Invalid session.", 401);

    const newRefreshToken = generateRefreshToken();
    const newSession = await this.sessionRepo.create({
      userId: session.userId,
      refreshTokenHash: hashRefreshToken(newRefreshToken),
      userAgentHash: hashUserAgent(ctx.userAgent),
      ip: ctx.ip,
    });
    await this.sessionRepo.markUsedAndChain(session._id as Types.ObjectId, newSession._id as Types.ObjectId);

    const accessToken = signAccessToken({
      sub: session.userId.toString(),
      role: user.role,
      sid: (newSession._id as Types.ObjectId).toString(),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const session = await this.sessionRepo.findByTokenHash(hashRefreshToken(refreshToken));
    if (session) {
      await this.sessionRepo.revoke(session._id as Types.ObjectId);
    }
  }

  async logoutAllDevices(userId: Types.ObjectId) {
    await this.sessionRepo.revokeAllForUser(userId);
  }

  async setupMfa(userId: Types.ObjectId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404);

    const { plainSecret, encryptedSecret } = generateMfaSecret();
    await this.userRepo.setMfaSecret(userId, encryptedSecret);

    const otpauthUrl = buildOtpAuthUrl(user.email, plainSecret);

    return { otpauthUrl, plainSecret };
  }

  async confirmMfa(userId: Types.ObjectId, totpCode: string) {
    const user = await this.userRepo.findById(userId, true);
    if (!user?.mfaSecret) throw new AppError("MFA setup not initiated.", 400);

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) throw new AppError("Invalid authentication code.", 401);

    await this.userRepo.enableMfa(userId);
  }

  async changePassword(userId: Types.ObjectId, currentPassword: string, newPassword: string, ctx: RequestContext) {
    const user = await this.userRepo.findById(userId, true);
    if (!user) throw new AppError("User not found.", 404);

    const ok = await verifyPassword(user.passwordHash, currentPassword);
    if (!ok) throw new AppError("Current password is incorrect.", 401);

    assertPasswordPolicy(newPassword, [user.email]);

    if (await isPasswordReused(newPassword, user.passwordHistory)) {
      throw new AppError("Password was used recently. Choose a different password.", 400);
    }

    const newHash = await hashPassword(newPassword);
    const newHistory = pushPasswordHistory(user.passwordHistory, newHash);
    await this.userRepo.updatePassword(userId, newHash, newHistory);
    await this.sessionRepo.revokeAllForUser(userId);

    await logActivity({ userId, action: "password_changed", ip: ctx.ip, userAgent: ctx.userAgent });
  }
}
