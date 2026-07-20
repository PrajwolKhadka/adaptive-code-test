import { Router } from "express";
import { questionController } from "../controllers/question.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { createQuestionSchema, updateQuestionSchema } from "../dtos/question.dto";
import { Role } from "../models/index.models";
import { apiLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

router.post("/bulk-import", apiLimiter, questionController.bulkImport);
router.post("/", apiLimiter, validateBody(createQuestionSchema), questionController.create);
router.patch("/:id", apiLimiter, validateBody(updateQuestionSchema), questionController.update);
router.delete("/:id", apiLimiter, questionController.remove);
router.get("/", apiLimiter, questionController.listAdmin);
router.get("/:id", apiLimiter, questionController.getOne);

export default router;