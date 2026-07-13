import { Router } from "express";
import { testController } from "../controllers/test.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { submitAttemptSchema, purchaseHintSchema } from "../dtos/test.dto";
import { Role } from "../models/index.models";
import { apiLimiter, submissionLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// Students only — admins manage questions, not take tests, keeping the
// least-privilege boundary clean between the two roles.
router.use(requireAuth, requireRole(Role.STUDENT));

router.post("/", apiLimiter, testController.start);
router.get("/:testId/next-question", apiLimiter, testController.nextQuestion);
router.post("/:testId/hint", apiLimiter, validateBody(purchaseHintSchema), testController.purchaseHint);
router.post("/:testId/attempts", submissionLimiter, validateBody(submitAttemptSchema), testController.submitAttempt);
router.post("/:testId/finalize", apiLimiter, testController.finalize);

export default router;
