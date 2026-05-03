import { Router, type Request, type Response } from "express";
import { db, usersTable, reviewsTable, watchlistTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";
import { getSeasonInfo } from "../utils/season-reset";

const router = Router();

// GET /api/leaderboard?limit=50&period=alltime|weekly
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);
    const period = req.query.period === "weekly" ? "weekly" : "alltime";
    const orderCol = period === "weekly" ? usersTable.weeklyXp : usersTable.totalXp;

    const rows = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        totalXp: usersTable.totalXp,
        weeklyXp: usersTable.weeklyXp,
        createdAt: usersTable.createdAt,
        reviewCount: sql<number>`(SELECT COUNT(*) FROM ${reviewsTable} WHERE ${reviewsTable.userName} = ${usersTable.username})::int`,
        watchlistCount: sql<number>`(SELECT COUNT(*) FROM ${watchlistTable} WHERE ${watchlistTable.userId} = ${usersTable.id})::int`,
      })
      .from(usersTable)
      .orderBy(desc(orderCol))
      .limit(limit);

    const ranked = rows
      .filter(u => (period === "weekly" ? (u.weeklyXp ?? 0) : (u.totalXp ?? 0)) >= 0)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        totalXp: u.totalXp ?? 0,
        weeklyXp: u.weeklyXp ?? 0,
        xp: period === "weekly" ? (u.weeklyXp ?? 0) : (u.totalXp ?? 0),
        level: Math.floor(Math.sqrt((u.totalXp ?? 0) / 100)),
        reviewCount: Number(u.reviewCount ?? 0),
        watchlistCount: Number(u.watchlistCount ?? 0),
        memberSince: u.createdAt,
      }));

    const seasonInfo = await getSeasonInfo();

    res.json({ leaderboard: ranked, total: ranked.length, period, season: seasonInfo });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
