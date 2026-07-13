import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { createQuestionSchema, updateQuestionSchema } from "../dtos/question.dto";
import { Role } from "../models/index.models";
import { apiLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// All routes here are admin-only. Deliberately NOT exposing a
// GET /questions/:id for students — letting students fetch arbitrary
// question IDs directly would let them browse the full bank and defeat
// the adaptive selection (and is a straightforward IDOR/enumeration
// surface). Students only ever see a question via the Test flow
// (see test.routes.ts), which enforces "this question is in your
// snapshotted pool" before returning anything.
router.use(requireAuth, requireRole(Role.ADMIN));

router.post("/", apiLimiter, validateBody(createQuestionSchema), questionController.create);
router.patch("/:id", apiLimiter, validateBody(updateQuestionSchema), questionController.update);
router.delete("/:id", apiLimiter, questionController.remove);
router.get("/", apiLimiter, questionController.listAdmin);

export default router;
