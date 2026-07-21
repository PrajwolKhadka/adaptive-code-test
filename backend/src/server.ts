import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { connectDB } from "./config/db";
import { logger } from "./config/logger";

const PORT = process.env.PORT ?? 5001;
const MONGO_URI = process.env.MONGO_URI as string;

async function bootstrap() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await connectDB(MONGO_URI);

  const app = createApp();
  app.listen(Number(PORT), "0.0.0.0", () => {
    logger.info(`Server listening on port 0.0.0.0:${PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});
