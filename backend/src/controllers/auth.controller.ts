import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies";
import { AppError } from "../middlewares/errorHandler.middleware";
import { Types } from "mongoose";

const authService = new AuthService();

function getCtx(req: Request) {
  return { ip: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const user = await authService.register(email, password, getCtx(req));
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, captchaToken } = req.body;
      const result = await authService.login(email, password, captchaToken, getCtx(req));

      if (result.mfaRequired) {
        // No cookies set yet — the client must complete MFA before a
        // session exists. mfaChallengeToken is short-lived and single-purpose.
        return res.status(200).json({ success: true, mfaRequired: true, mfaChallengeToken: result.mfaChallengeToken });
      }

      setAuthCookies(res, result.accessToken, result.refreshToken);
      res.status(200).json({ success: true, mfaRequired: false });
    } catch (err) {
      next(err);
    }
  },

  async verifyMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const { mfaChallengeToken, totpCode } = req.body;
      const { accessToken, refreshToken } = await authService.verifyMfaAndIssueSession(mfaChallengeToken, totpCode, getCtx(req));
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
      // If refresh fails, proactively clear cookies so the client doesn't
      // keep retrying with a dead token.
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
      clearAuthCookies(res); // force re-login on all devices after password change
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
};
