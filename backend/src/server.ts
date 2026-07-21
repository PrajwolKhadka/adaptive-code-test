// import dotenv from "dotenv";
// dotenv.config();

// import { createApp } from "./app";
// import { connectDB } from "./config/db";
// import { logger } from "./config/logger";
// import https from "https";
// import fs from "fs";
// import path from "path";

// const PORT = process.env.PORT ?? 5001;
// const MONGO_URI = process.env.MONGO_URI as string;

// async function bootstrap() {
//   if (!MONGO_URI) {
//     throw new Error("MONGO_URI is not set");
//   }

//   await connectDB(MONGO_URI);

//   const app = createApp();
//   app.listen(Number(PORT), "0.0.0.0", () => {
//     logger.info(`Server listening on port 0.0.0.0:${PORT}`);
//   });
// }

// bootstrap().catch((err) => {
//   logger.error("Failed to start server", { error: err.message });
//   process.exit(1);
// });
import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { connectDB } from "./config/db";
import { logger } from "./config/logger";
import https from "https";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT ?? 5001;
const MONGO_URI = process.env.MONGO_URI as string;

async function bootstrap() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set");
  }

  await connectDB(MONGO_URI);

  const app = createApp();

  const httpsOptions = {
    key: fs.readFileSync(
      path.join(process.cwd(), "../certs/localhost-key.pem")
    ),
    cert: fs.readFileSync(
      path.join(process.cwd(), "../certs/localhost-cert.pem")
    ),
  };

  https
    .createServer(httpsOptions, app)
    .listen(Number(PORT), "0.0.0.0", () => {
      logger.info(`HTTPS Server listening on https://localhost:${PORT}`);
    });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server", { error: err.message });
  process.exit(1);
});