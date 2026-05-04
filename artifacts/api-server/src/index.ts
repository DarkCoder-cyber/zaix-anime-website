import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// ─── Global crash guards ──────────────────────────────────────────────────────
// These prevent any unhandled promise rejection or sync throw from killing
// the Node process. All errors are logged but the server keeps running.
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise: String(promise) }, "Unhandled promise rejection — server kept alive");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — server kept alive");
  // Do NOT call process.exit — let the server continue serving requests
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  logger.error({ err, origin }, "Uncaught exception monitor");
});
// ─────────────────────────────────────────────────────────────────────────────

app.listen(port, "0.0.0.0", (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
