import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { apiLimiter } from "./middlewares/rateLimit.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import routes from "./routes";
import path from "path";

export function createApp(): Application {
  const app = express();
  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",") ?? [];

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // app.use(
  //   cors({
  //     origin: process.env.CLIENT_ORIGIN,
  //     credentials: true,
  //   }),
  // );
  app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
  app.use(
    "/uploads/avatars",
    express.static(path.join(process.cwd(), "uploads", "avatars"), {
      dotfiles: "deny",
      maxAge: "7d",
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(hpp());

  app.use("/api", apiLimiter);
  app.use("/api", routes);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  app.use(errorHandler);

  return app;
}
