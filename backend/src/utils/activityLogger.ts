import { ActivityLogModel } from "../models/index.models";
import { Types } from "mongoose";

interface LogParams {
  userId?: Types.ObjectId;
  action: string;
  ip: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  severity?: "info" | "warn" | "alert";
}
/**
 * Persists an activity log entry to the database and, when severity is "alert",
 * also emits a console warning so critical events are immediately visible in the logs.
 * Used for audit trails, security events, and operational monitoring.
 */
export async function logActivity(params: LogParams): Promise<void> {
  await ActivityLogModel.create({
    userId: params.userId,
    action: params.action,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: params.metadata,
    severity: params.severity ?? "info",
  });

  if (params.severity === "alert") {
    // eslint-disable-next-line no-console
    console.warn(`[ALERT] ${params.action}`, params.metadata);
  }
}
