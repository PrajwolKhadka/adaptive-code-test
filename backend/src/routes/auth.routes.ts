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
} from "../dtos/auth.dtos";

const router = Router();

// Public endpoints — all behind the strict auth rate limiter.
router.post("/register", authLimiter, validateBody(registerSchema), authController.register);
router.post("/login", authLimiter, validateBody(loginSchema), authController.login);
router.post("/verify-mfa", authLimiter, validateBody(verifyMfaSchema), authController.verifyMfa);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", authController.logout);

// Authenticated endpoints.
router.post("/mfa/setup", requireAuth, authController.setupMfa);
router.post("/mfa/confirm", requireAuth, validateBody(enableMfaSchema), authController.confirmMfa);
router.post("/logout-all", requireAuth, authController.logoutAllDevices);
router.post("/change-password", requireAuth, authLimiter, validateBody(changePasswordSchema), authController.changePassword);

export default router;
