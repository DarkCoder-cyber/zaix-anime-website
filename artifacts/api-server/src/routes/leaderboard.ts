import { Router, type Request, type Response } from "express";
import { db, usersTable, reviewsTable, watchlistTable } from "@workspace/db";
import { desc, gt, sql } from "drizzle-orm";

const router = Router();

// GET /api/leaderboard?limit=50
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 100);

    const rows = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        totalXp: usersTable.totalXp,
        createdAt: usersTable.createdAt,
        reviewCount: sql<number>`(SELECT COUNT(*) FROM ${reviewsTable} WHERE ${reviewsTable.userName} = ${usersTable.username})::int`,
        watchlistCount: sql<number>`(SELECT COUNT(*) FROM ${watchlistTable} WHERE ${watchlistTable.userId} = ${usersTable.id})::int`,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.totalXp))
      .limit(limit);

    const ranked = rows.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      totalXp: u.totalXp ?? 0,
      level: Math.floor(Math.sqrt((u.totalXp ?? 0) / 100)),
      reviewCount: Number(u.reviewCount ?? 0),
      watchlistCount: Number(u.watchlistCount ?? 0),
      memberSince: u.createdAt,
    }));

    res.json({ leaderboard: ranked, total: ranked.length });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch leaderboard");
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
