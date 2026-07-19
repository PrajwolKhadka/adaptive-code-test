import { Router } from "express";
import authRoutes from "./auth.routes";
import questionRoutes from "./question.routes";
import testRoutes from "./test.routes";
import resourceRoutes from "./resource.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/questions", questionRoutes);
router.use("/tests", testRoutes);
router.use("/resources", resourceRoutes);
router.use("/admin", adminRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "Adaptive Code Platform API" });
});

export default router;
