import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "Adaptive Code Platform API" });
});

export default router;
