import mongoose from "mongoose";
import { logger } from "./logger";

export async function connectDB(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(uri);
    logger.info("MongoDB connected");
  } catch (err) {
    logger.error("MongoDB connection failed", { error: (err as Error).message });
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
}
