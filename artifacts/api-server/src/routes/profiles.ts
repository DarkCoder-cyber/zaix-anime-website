import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, watchlistTable, reviewsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/users/:username/profile — public profile
router.get("/users/:username/profile", async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const [user] = await db
      .select({ id: usersTable.id, username: usersTable.username, totalXp: usersTable.totalXp, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [watchlist, [reviewCount]] = await Promise.all([
      db.select().from(watchlistTable).where(eq(watchlistTable.userId, user.id)).orderBy(desc(watchlistTable.createdAt)).limit(30),
      db.select({ count: count() }).from(reviewsTable).where(eq(reviewsTable.userName, user.username)),
    ]);

    const currentlyWatching = watchlist.filter(w => w.status === "watching");
    const completed = watchlist.filter(w => w.status === "completed");
    const planToWatch = watchlist.filter(w => w.status === "plan_to_watch");
    const dropped = watchlist.filter(w => w.status === "dropped");

    res.json({
      user: { id: user.id, username: user.username, totalXp: user.totalXp ?? 0, createdAt: user.createdAt },
      stats: {
        totalWatching: currentlyWatching.length,
        totalCompleted: completed.length,
        totalPlanToWatch: planToWatch.length,
        totalDropped: dropped.length,
        totalReviews: Number(reviewCount?.count ?? 0),
      },
      currentlyWatching,
      completed: completed.slice(0, 12),
      planToWatch: planToWatch.slice(0, 12),
      allWatchlist: watchlist,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

export default router;
