import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimit.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  verifyMfaSchema,
  enableMfaSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../dtos/auth.dtos";
import { handleAvatarUpload } from "../middlewares/avatarUpload.middleware";

const router = Router();


router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/verify-email", authLimiter, validateBody(verifyEmailSchema), authController.verifyEmail);
router.post("/resend-verification", authLimiter, validateBody(resendVerificationSchema), authController.resendVerification);

router.post("/me/avatar", requireAuth, handleAvatarUpload, authController.uploadAvatar);
router.delete("/me/avatar", requireAuth, authController.removeAvatar);

router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/verify-mfa", authLimiter, validateBody(verifyMfaSchema), authController.verifyMfa);

router.post("/mfa/setup-with-challenge", authLimiter, authController.mfaSetupWithChallenge);
router.post("/mfa/confirm-with-challenge", authLimiter, validateBody(enableMfaSchema), authController.mfaConfirmWithChallenge);

router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);


router.get("/google", authLimiter, authController.googleRedirect);
router.get("/google/callback", authLimiter, authController.googleCallback);
router.get("/github", authLimiter, authController.githubRedirect);
router.get("/github/callback", authLimiter, authController.githubCallback);


router.get("/me", requireAuth, authController.me);
router.post("/mfa/setup", requireAuth, authController.setupMfa);
router.post("/mfa/confirm", requireAuth, validateBody(enableMfaSchema), authController.confirmMfa);
router.post("/logout-all", requireAuth, authController.logoutAllDevices);
router.post("/change-password", requireAuth, authLimiter, validateBody(changePasswordSchema), authController.changePassword);

export default router;
