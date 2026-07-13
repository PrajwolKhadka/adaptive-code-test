import { Router } from "express";
import authRoutes from "./auth.routes";
import questionRoutes from "./question.routes";
import testRoutes from "./test.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/questions", questionRoutes);
router.use("/tests", testRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "Adaptive Code Platform API" });
});

export default router;
