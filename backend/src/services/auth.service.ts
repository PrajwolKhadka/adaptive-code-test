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
import { decryptSecret } from "../utils/crypto";
import { verifyCaptcha } from "../utils/captcha";
import { logActivity } from "../utils/activityLogger";
import { AppError } from "../middlewares/errorHandler.middleware";
import { Role } from "../models/index.models";
import {
  generateNumericOtp,
  hashOtp,
  verifyOtpHash,
  otpExpiresAt,
  MAX_OTP_ATTEMPTS,
} from "../utils/otp";
import { sendEmail, otpEmailTemplate } from "../utils/email";
import { OAuthProfile } from "../utils/oauth";

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
      // Deliberately vague — do not reveal whether the email is registered.
      // A distinct "email already exists" message is a classic user-
      // enumeration vector.
      throw new AppError(
        "Unable to complete registration with the provided details.",
        400,
      );
    }

    assertPasswordPolicy(password, [email]);

    const passwordHash = await hashPassword(password);
    const user = await this.userRepo.create({
      email,
      passwordHash,
      passwordHistory: [passwordHash],
    });

    await this.issueAndSendVerificationOtp(
      user._id as Types.ObjectId,
      user.email,
    );

    await logActivity({
      userId: user._id as Types.ObjectId,
      action: "register",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    // No session issued — the account exists but is unusable until the
    // email is verified (see login()'s isEmailVerified check).
    return { id: user._id, email: user.email };
  }

  private async issueAndSendVerificationOtp(
    userId: Types.ObjectId,
    email: string,
  ) {
    const otp = generateNumericOtp();
    await this.userRepo.setEmailVerificationOtp(
      userId,
      hashOtp(otp),
      otpExpiresAt(),
    );
    await sendEmail(email, "Verify your email", otpEmailTemplate(otp));
  }

  async verifyEmail(email: string, otp: string, ctx: RequestContext) {
    const user = await this.userRepo.findByEmail(email, true);
    if (!user) {
      // Same enumeration-avoidance principle as register/login.
      throw new AppError("Invalid or expired verification code.", 400);
    }

    if (user.isEmailVerified) {
      throw new AppError("Email is already verified.", 400);
    }

    if ((user.emailVerificationAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
      throw new AppError(
        "Too many attempts. Request a new verification code.",
        429,
      );
    }

    if (
      !user.emailVerificationOtpHash ||
      !user.emailVerificationOtpExpiresAt ||
      user.emailVerificationOtpExpiresAt < new Date()
    ) {
      throw new AppError("Verification code expired. Request a new one.", 400);
    }

    const valid = verifyOtpHash(otp, user.emailVerificationOtpHash);
    if (!valid) {
      await this.userRepo.incrementEmailOtpAttempts(user._id as Types.ObjectId);
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "email_verify_failed",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
      throw new AppError("Invalid or expired verification code.", 400);
    }

    await this.userRepo.markEmailVerified(user._id as Types.ObjectId);
    await logActivity({
      userId: user._id as Types.ObjectId,
      action: "email_verified",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  async resendVerification(email: string, ctx: RequestContext) {
    const user = await this.userRepo.findByEmail(email);
    // Always respond the same way regardless of whether the account exists
    // or is already verified — prevents email enumeration via this endpoint.
    // Route-level rate limiting (authLimiter) is what actually stops abuse,
    // not this response shape.
    if (user && !user.isEmailVerified) {
      await this.issueAndSendVerificationOtp(
        user._id as Types.ObjectId,
        user.email,
      );
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "verification_resent",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    }
  }

  /**
   * Step 1 of login: verify credentials. MFA is mandatory app-wide, so this
   * NEVER returns a usable session directly — it always hands back an
   * mfaChallengeToken. The client's next step depends on mfaSetupRequired:
   * - false: user already has TOTP enrolled -> call /auth/verify-mfa
   * - true: first login, no TOTP yet -> call /auth/mfa/setup-with-challenge
   *   then /auth/mfa/confirm-with-challenge, which enrolls AND completes
   *   login in one step.
   */
  async login(
    email: string,
    password: string,
    captchaToken: string | undefined,
    ctx: RequestContext,
  ) {
    const user = await this.userRepo.findByEmail(email, true);
    console.log("Before login:", {
    failedLoginAttempts: user?.failedLoginAttempts,
    lockedUntil: user?.lockedUntil,
});
    // Constant-shape response whether the user exists or not: always run
    // a verify() call (against a dummy hash if no user, or if the account
    // is OAuth-only and has no password) so response timing doesn't leak
    // account existence via a timing side channel.
    const DUMMY_HASH =
      "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$ZmFrZWhhc2hmb3J0aW1pbmc";
    const passwordOk = await verifyPassword(
      user?.passwordHash ?? DUMMY_HASH,
      password,
    );

    if (!user) {
      await logActivity({
        action: "login_failed_unknown_email",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
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
      throw new AppError(
        "Account temporarily locked due to repeated failed attempts.",
        423,
      );
    }

    // CAPTCHA required once an account has racked up enough recent failures —
    // a proxy for "this login attempt is high-risk" without requiring it
    // for every legitimate user on every login.
    console.log("CAPTCHA CHECK", {
  attempts: user.failedLoginAttempts,
  threshold: CAPTCHA_TRIGGER_THRESHOLD,
});
    if (user.failedLoginAttempts >= CAPTCHA_TRIGGER_THRESHOLD) {
      console.log("INSIDE CAPTCHA BLOCK");
      const captchaOk = await verifyCaptcha(captchaToken, ctx.ip);
      console.log("captchaOk =", captchaOk);
      if (!captchaOk) {
        throw new AppError("CAPTCHA verification required.", 400);
      }
    }

    // if (!passwordOk) {
    //   await this.userRepo.incrementFailedAttempts(
    //     user._id as Types.ObjectId,
    //     LOCK_THRESHOLD,
    //     LOCK_DURATION_MS,
    //   );
    //   await logActivity({
    //     userId: user._id as Types.ObjectId,
    //     action: "login_failed_bad_password",
    //     ip: ctx.ip,
    //     userAgent: ctx.userAgent,
    //     severity: "warn",
    //   });
    //   throw new AppError("Invalid email or password.", 401);
    // }
    if (!passwordOk) {
      await this.userRepo.incrementFailedAttempts(
        user._id as Types.ObjectId,
        LOCK_THRESHOLD,
        LOCK_DURATION_MS,
      );

      const updatedUser = await this.userRepo.findByEmail(email, true);

      console.log("After increment:", {
        failedLoginAttempts: updatedUser?.failedLoginAttempts,
        lockedUntil: updatedUser?.lockedUntil,
      });

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

    if (!user.isEmailVerified) {
      throw new AppError("Please verify your email before logging in.", 403);
    }

    if (isPasswordExpired(user.passwordChangedAt)) {
      // Signal to the client to force a password-change flow rather than
      // issuing a session — do not silently let an expired password through.
      throw new AppError(
        "Password expired. Please reset your password to continue.",
        403,
      );
    }

    const mfaChallengeToken = signMfaChallengeToken(
      (user._id as Types.ObjectId).toString(),
    );
    await logActivity({
      userId: user._id as Types.ObjectId,
      action: user.mfaEnabled
        ? "login_password_ok_awaiting_mfa"
        : "login_password_ok_awaiting_mfa_setup",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { mfaSetupRequired: !user.mfaEnabled, mfaChallengeToken };
  }

  /**
   * Called after Google/GitHub confirms the user's identity. Finds an
   * existing account by provider ID, links the provider to an existing
   * password account with a matching (provider-verified) email, or
   * provisions a brand-new account. Always routes through the same
   * mandatory-MFA challenge as password login — OAuth authenticates WHO
   * the user is, but doesn't substitute for this app's own 2FA requirement.
   */
  async loginOrRegisterOAuth(
    provider: "google" | "github",
    profile: OAuthProfile,
    ctx: RequestContext,
  ) {
    if (!profile.emailVerified) {
      throw new AppError(
        "Your email address is not verified with the provider. Please verify it there first.",
        403,
      );
    }

    const findByProviderId =
      provider === "google"
        ? this.userRepo.findByGoogleId
        : this.userRepo.findByGithubId;
    let user = await findByProviderId.call(this.userRepo, profile.providerId);

    if (!user) {
      const existingByEmail = await this.userRepo.findByEmail(profile.email);
      if (existingByEmail) {
        // Link rather than duplicate — same human, different login method.
        await this.userRepo.linkOAuthProvider(
          existingByEmail._id as Types.ObjectId,
          provider,
          profile.providerId,
        );
        // Provider already verified this email, so it's safe to also mark
        // isEmailVerified on the linked account, even if it was pending.
        if (!existingByEmail.isEmailVerified) {
          await this.userRepo.markEmailVerified(
            existingByEmail._id as Types.ObjectId,
          );
        }
        user = existingByEmail;
      } else {
        user = await this.userRepo.createOAuthAccount({
          email: profile.email,
          provider,
          providerId: profile.providerId,
        });
      }
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(
        "Account temporarily locked due to repeated failed attempts.",
        423,
      );
    }

    const mfaChallengeToken = signMfaChallengeToken(
      (user._id as Types.ObjectId).toString(),
    );
    await logActivity({
      userId: user._id as Types.ObjectId,
      action: `oauth_login_${provider}`,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { mfaSetupRequired: !user.mfaEnabled, mfaChallengeToken };
  }

  async verifyMfaAndIssueSession(
    mfaChallengeToken: string,
    totpCode: string,
    ctx: RequestContext,
  ) {
    let payload;
    try {
      payload = verifyMfaChallengeToken(mfaChallengeToken);
    } catch {
      throw new AppError(
        "MFA challenge expired or invalid. Please log in again.",
        401,
      );
    }

    const user = await this.userRepo.findById(payload.sub, true);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new AppError("MFA is not configured for this account.", 400);
    }

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) {
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "mfa_verify_failed",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
      throw new AppError("Invalid authentication code.", 401);
    }

    const session = await this.issueSession(
      user._id as Types.ObjectId,
      user.role,
      ctx,
    );
    await logActivity({
      userId: user._id as Types.ObjectId,
      action: "mfa_verify_success",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return session;
  }

  /** Issues a new access token + refresh token pair and persists the session. */
  private async issueSession(
    userId: Types.ObjectId,
    role: Role,
    ctx: RequestContext,
  ) {
    const refreshToken = generateRefreshToken();
    const session = await this.sessionRepo.create({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgentHash: hashUserAgent(ctx.userAgent),
      ip: ctx.ip,
    });

    const accessToken = signAccessToken({
      sub: userId.toString(),
      role,
      sid: (session._id as Types.ObjectId).toString(),
    });
    return { accessToken, refreshToken };
  }

  /**
   * Refresh flow with rotation + reuse detection. Every call consumes the
   * presented refresh token and issues a new one; presenting an
   * already-used token triggers a full session wipe for that user.
   */
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

    // Device-binding check: flag (don't necessarily hard-block, to avoid
    // locking out users whose browser legitimately updates its UA string)
    // a refresh from a different device than the one that started the
    // session. Hard-block is easy to flip on if your report wants strict
    // binding — trade-off noted here for the write-up.
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
    await this.sessionRepo.markUsedAndChain(
      session._id as Types.ObjectId,
      newSession._id as Types.ObjectId,
    );

    const accessToken = signAccessToken({
      sub: session.userId.toString(),
      role: user.role,
      sid: (newSession._id as Types.ObjectId).toString(),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const session = await this.sessionRepo.findByTokenHash(
      hashRefreshToken(refreshToken),
    );
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
    return this.generateAndStoreMfaSecret(userId, user.email);
  }

  async confirmMfa(userId: Types.ObjectId, totpCode: string) {
    const user = await this.userRepo.findById(userId, true);
    if (!user?.mfaSecret) throw new AppError("MFA setup not initiated.", 400);

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) throw new AppError("Invalid authentication code.", 401);

    await this.userRepo.enableMfa(userId);
  }

  /**
   * Same as setupMfa, but authenticated via the short-lived MFA challenge
   * token instead of a full session — used for first-time enrollment
   * immediately after register/OAuth, before any session exists yet.
   */
  async setupMfaWithChallenge(mfaChallengeToken: string) {
    const payload = this.mustVerifyChallenge(mfaChallengeToken);
    const user = await this.userRepo.findById(payload.sub, true);
    if (!user) throw new AppError("User not found.", 404);
    if (user.mfaEnabled)
      throw new AppError(
        "MFA is already enabled for this account. Use the normal login flow.",
        400,
      );

    if (user.mfaSecret) {
      const otpauthUrl = buildOtpAuthUrl(
        user.email,
        decryptSecret(user.mfaSecret),
      );
      return { otpauthUrl };
    }

    return this.generateAndStoreMfaSecret(
      user._id as Types.ObjectId,
      user.email,
    );
  }

  /**
   * Confirms first-time TOTP enrollment AND completes login in one step —
   * this is the only path that turns an mfaChallengeToken into a real
   * session for a user who didn't have MFA enrolled yet.
   */
  async confirmMfaWithChallenge(
    mfaChallengeToken: string,
    totpCode: string,
    ctx: RequestContext,
  ) {
    const payload = this.mustVerifyChallenge(mfaChallengeToken);
    const user = await this.userRepo.findById(payload.sub, true);
    if (!user?.mfaSecret) throw new AppError("MFA setup not initiated.", 400);
    if (user.mfaEnabled)
      throw new AppError(
        "MFA is already enabled for this account. Use the normal login flow.",
        400,
      );

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) {
      await logActivity({
        userId: user._id as Types.ObjectId,
        action: "mfa_enroll_confirm_failed",
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        severity: "warn",
      });
      throw new AppError("Invalid authentication code.", 401);
    }

    await this.userRepo.enableMfa(user._id as Types.ObjectId);
    const session = await this.issueSession(
      user._id as Types.ObjectId,
      user.role,
      ctx,
    );
    await logActivity({
      userId: user._id as Types.ObjectId,
      action: "mfa_enrolled_and_logged_in",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return session;
  }

  private mustVerifyChallenge(mfaChallengeToken: string) {
    try {
      return verifyMfaChallengeToken(mfaChallengeToken);
    } catch {
      throw new AppError("Session expired. Please log in again.", 401);
    }
  }

  private async generateAndStoreMfaSecret(
    userId: Types.ObjectId,
    email: string,
  ) {
    const { plainSecret, encryptedSecret } = generateMfaSecret();
    await this.userRepo.setMfaSecret(userId, encryptedSecret);
    // Email is read from the authenticated user's own record, never from
    // client input — prevents a client from labeling the QR code with an
    // arbitrary/spoofed identity.
    const otpauthUrl = buildOtpAuthUrl(email, plainSecret);
    // Return the plain secret + otpauth URL ONCE, for QR provisioning.
    // It is never returned again after this call — only the encrypted
    // form is persisted.
    return { otpauthUrl, plainSecret };
  }

  async getPublicProfile(userId: Types.ObjectId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404);
    // Deliberately whitelist fields rather than returning the Mongoose doc
    // directly — even with passwordHash/mfaSecret excluded by schema
    // `select: false`, an explicit whitelist here is a second layer that
    // survives future schema changes without silently leaking a new
    // sensitive field to the client.
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      mfaEnabled: user.mfaEnabled,
      avatarUrl: user.avatar?.storedFileName
        ? `/uploads/avatars/${user.avatar.storedFileName}`
        : null,
      exp: user.exp,
      theta: user.theta,
    };
  }

  async changePassword(
    userId: Types.ObjectId,
    currentPassword: string,
    newPassword: string,
    ctx: RequestContext,
  ) {
    const user = await this.userRepo.findById(userId, true);
    if (!user) throw new AppError("User not found.", 404);

    if (!user.passwordHash) {
      // OAuth-only account with no password yet — "change password" doesn't
      // apply; they'd need a distinct "set password" flow (not built here,
      // noted as future work).
      throw new AppError(
        "This account doesn't have a password set. Log in via your OAuth provider.",
        400,
      );
    }

    const ok = await verifyPassword(user.passwordHash, currentPassword);
    if (!ok) throw new AppError("Current password is incorrect.", 401);

    assertPasswordPolicy(newPassword, [user.email]);

    if (await isPasswordReused(newPassword, user.passwordHistory)) {
      throw new AppError(
        "Password was used recently. Choose a different password.",
        400,
      );
    }

    const newHash = await hashPassword(newPassword);
    const newHistory = pushPasswordHistory(user.passwordHistory, newHash);
    await this.userRepo.updatePassword(userId, newHash, newHistory);

    // Password change invalidates all existing sessions — a stolen session
    // shouldn't survive a password reset.
    await this.sessionRepo.revokeAllForUser(userId);

    await logActivity({
      userId,
      action: "password_changed",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }
}
