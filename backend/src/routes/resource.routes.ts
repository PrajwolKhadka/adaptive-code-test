import { Router } from "express";
import { resourceController } from "../controllers/resource.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { createVideoResourceSchema, createPdfResourceSchema } from "../dtos/resource.dto";
import { Role } from "../models/index.models";
import { apiLimiter } from "../middlewares/rateLimit.middleware";
import { pdfUpload } from "../utils/upload";

const router = Router();

router.use(requireAuth);

router.get("/", apiLimiter, resourceController.list);
router.get("/:id/download", apiLimiter, resourceController.download);

router.post("/video", apiLimiter, requireRole(Role.ADMIN), validateBody(createVideoResourceSchema), resourceController.createVideo);
router.post(
  "/pdf",
  apiLimiter,
  requireRole(Role.ADMIN),
  pdfUpload.single("file"),
  validateBody(createPdfResourceSchema),
  resourceController.createPdf,
);
router.delete("/:id", apiLimiter, requireRole(Role.ADMIN), resourceController.remove);

export default router;
