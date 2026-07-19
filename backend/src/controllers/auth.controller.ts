import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import {
  setAuthCookies,
  clearAuthCookies,
  setMfaChallengeCookie,
  clearMfaChallengeCookie,
  setOAuthStateCookie,
  clearOAuthStateCookie,
} from "../utils/cookies";
import { AppError } from "../middlewares/errorHandler.middleware";
import { Types } from "mongoose";
import { buildGoogleAuthUrl, exchangeGoogleCode, buildGithubAuthUrl, exchangeGithubCode, generateOAuthState } from "../utils/oauth";

const authService = new AuthService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN as string;

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await authService.register(email, password, getCtx(req));
      res.status(201).json({ success: true, data: user, message: "Check your email for a verification code." });
    } catch (err) {
      next(err);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      await authService.verifyEmail(email, otp, getCtx(req));
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resendVerification(email, getCtx(req));
      res.status(200).json({ success: true, message: "If that account exists and is unverified, a new code has been sent." });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, captchaToken } = req.body;
      const result = await authService.login(email, password, captchaToken, getCtx(req));

      setMfaChallengeCookie(res, result.mfaChallengeToken);
      res.status(200).json({ success: true, mfaSetupRequired: result.mfaSetupRequired });
    } catch (err) {
      next(err);
    }
  },

  async verifyMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const mfaChallengeToken = req.cookies?.mfa_challenge_token;
      if (!mfaChallengeToken) throw new AppError("MFA challenge expired. Please log in again.", 401);

      const { totpCode } = req.body;
      const { accessToken, refreshToken } = await authService.verifyMfaAndIssueSession(mfaChallengeToken, totpCode, getCtx(req));
      clearMfaChallengeCookie(res);
      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async mfaSetupWithChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const mfaChallengeToken = req.cookies?.mfa_challenge_token;
      if (!mfaChallengeToken) throw new AppError("MFA challenge expired. Please log in again.", 401);

      const { otpauthUrl } = await authService.setupMfaWithChallenge(mfaChallengeToken);
      res.status(200).json({ success: true, data: { otpauthUrl } });
    } catch (err) {
      next(err);
    }
  },

  async mfaConfirmWithChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const mfaChallengeToken = req.cookies?.mfa_challenge_token;
      if (!mfaChallengeToken) throw new AppError("MFA challenge expired. Please log in again.", 401);

      const { totpCode } = req.body;
      const { accessToken, refreshToken } = await authService.confirmMfaWithChallenge(mfaChallengeToken, totpCode, getCtx(req));
      clearMfaChallengeCookie(res);
      setAuthCookies(res, accessToken, refreshToken);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) throw new AppError("No session found.", 401);

      const result = await authService.refresh(refreshToken, getCtx(req));
      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (refreshToken) await authService.logout(refreshToken);
      clearAuthCookies(res);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async logoutAllDevices(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logoutAllDevices(new Types.ObjectId(req.user!.id));
      clearAuthCookies(res);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getPublicProfile(new Types.ObjectId(req.user!.id));
      res.status(200).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async setupMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const { otpauthUrl } = await authService.setupMfa(new Types.ObjectId(req.user!.id));
      res.status(200).json({ success: true, data: { otpauthUrl } });
    } catch (err) {
      next(err);
    }
  },

  async confirmMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const { totpCode } = req.body;
      await authService.confirmMfa(new Types.ObjectId(req.user!.id), totpCode);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(new Types.ObjectId(req.user!.id), currentPassword, newPassword, getCtx(req));
      clearAuthCookies(res);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  // ---------- OAuth ----------

  googleRedirect(req: Request, res: Response) {
    const state = generateOAuthState();
    setOAuthStateCookie(res, state);
    res.redirect(buildGoogleAuthUrl(state));
  },

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      const expectedState = req.cookies?.oauth_state;
      clearOAuthStateCookie(res);

      if (!code || !state || !expectedState || state !== expectedState) {
        throw new AppError("Invalid OAuth state. Please try signing in again.", 400);
      }

      const profile = await exchangeGoogleCode(code);
      const result = await authService.loginOrRegisterOAuth("google", profile, getCtx(req));

      setMfaChallengeCookie(res, result.mfaChallengeToken);
      const nextPath = result.mfaSetupRequired ? "/mfa/setup" : "/mfa/verify";
      res.redirect(`${CLIENT_ORIGIN}${nextPath}`);
    } catch (err) {
      next(err);
    }
  },

  githubRedirect(req: Request, res: Response) {
    const state = generateOAuthState();
    setOAuthStateCookie(res, state);
    res.redirect(buildGithubAuthUrl(state));
  },

  async githubCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      const expectedState = req.cookies?.oauth_state;
      clearOAuthStateCookie(res);

      if (!code || !state || !expectedState || state !== expectedState) {
        throw new AppError("Invalid OAuth state. Please try signing in again.", 400);
      }

      const profile = await exchangeGithubCode(code);
      const result = await authService.loginOrRegisterOAuth("github", profile, getCtx(req));

      setMfaChallengeCookie(res, result.mfaChallengeToken);
      const nextPath = result.mfaSetupRequired ? "/mfa/setup" : "/mfa/verify";
      res.redirect(`${CLIENT_ORIGIN}${nextPath}`);
    } catch (err) {
      next(err);
    }
  },
};
