import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { scheduleWeeklyReset } from "./utils/season-reset";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Serve production frontend static files ───────────────────────────────────
// Built by: pnpm --filter @workspace/zaix-anime run build
// Output:   artifacts/zaix-anime/dist/public/
const STATIC_DIR = path.resolve(
  import.meta.dirname,           // artifacts/api-server/dist/
  "..",                          // artifacts/api-server/
  "..",                          // artifacts/
  "zaix-anime",
  "dist",
  "public",
);

app.use(express.static(STATIC_DIR, { maxAge: "1h", etag: true }));

// SPA fallback — any non-API route serves index.html so client-side routing works
app.get(/^(?!\/api).*$/, (_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// ─── Background jobs ──────────────────────────────────────────────────────────
scheduleWeeklyReset();
import("./utils/tmdb-sync").then(({ scheduleTmdbSync }) => scheduleTmdbSync()).catch(() => {});

export default app;
