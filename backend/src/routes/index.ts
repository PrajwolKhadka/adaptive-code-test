import { Router } from "express";

const router = Router();

// Mount feature routers here as they're built, e.g.:
// import authRoutes from "./auth.routes";
// router.use("/auth", authRoutes);
//
// import questionRoutes from "./question.routes";
// router.use("/questions", questionRoutes);
//
// import testRoutes from "./test.routes";
// router.use("/tests", testRoutes);

router.get("/", (_req, res) => {
  res.json({ message: "Adaptive Code Platform API" });
});

export default router;
