import express, { type Express } from "express";
import cors from "cors";
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
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Schedule weekly XP reset (checks on startup + every hour)
scheduleWeeklyReset();

// Schedule daily TMDB movie sync (runs 10s after boot, then every 24h)
import("./utils/tmdb-sync").then(({ scheduleTmdbSync }) => scheduleTmdbSync()).catch(() => {});

export default app;
