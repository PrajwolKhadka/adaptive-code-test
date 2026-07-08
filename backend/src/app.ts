import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import { apiLimiter } from "./middlewares/rateLimit.middleware";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import routes from "./routes";

export function createApp(): Application {
  const app = express();

  // Trust first proxy only — needed for correct IP detection behind a
  // reverse proxy (nginx/Render/etc), required for rate limiting and
  // activity logging to record real client IPs rather than the proxy's.
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

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "100kb" })); // cap body size — cheap DoS mitigation
  app.use(cookieParser());
  app.use(mongoSanitize()); // strips $/. operators from req.body/query/params — NoSQL injection defense
  app.use(hpp()); // HTTP parameter pollution defense

  app.use("/api", apiLimiter);
  app.use("/api", routes);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  app.use(errorHandler);

  return app;
}
