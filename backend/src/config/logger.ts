import winston from "winston";

// General application/debug logger — separate from ActivityLogModel,
// which is the auditable, DB-persisted security log (see models/activityLog.model.ts).
// This one is for operational diagnostics only; never log secrets, tokens,
// passwords, or full request bodies here.
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});
