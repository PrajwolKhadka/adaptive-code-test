import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { Role } from "../models/index.models";
import { apiLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

router.use(requireAuth, requireRole(Role.ADMIN));

router.get("/overview", apiLimiter, adminController.overview);
router.get("/performance", apiLimiter, adminController.performance);
router.get("/users", apiLimiter, adminController.listUsers);
router.delete("/users/:id", apiLimiter, adminController.deleteUser);

export default router;
