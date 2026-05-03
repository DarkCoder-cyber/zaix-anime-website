import { Router, type IRouter, type Request, type Response } from "express";
import { db, watchProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { extractUserId } from "../lib/auth-helpers";

const router: IRouter = Router();

// GET /api/progress?contentType=anime&contentId=21
router.get("/progress", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.json({ progress: null }); return; }
  const { contentType, contentId } = req.query;
  if (!contentType || !contentId) { res.json({ progress: null }); return; }
  try {
    const [row] = await db
      .select()
      .from(watchProgressTable)
      .where(
        and(
          eq(watchProgressTable.userId, userId),
          eq(watchProgressTable.contentType, String(contentType)),
          eq(watchProgressTable.contentId, String(contentId)),
        )
      )
      .limit(1);
    res.json({ progress: row ?? null });
  } catch {
    res.json({ progress: null });
  }
});

// GET /api/progress/all — all in-progress items for current user (for Continue Watching)
router.get("/progress/all", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.json({ items: [] }); return; }
  try {
    const rows = await db
      .select()
      .from(watchProgressTable)
      .where(eq(watchProgressTable.userId, userId))
      .orderBy(watchProgressTable.updatedAt);
    res.json({ items: rows.reverse() });
  } catch {
    res.json({ items: [] });
  }
});

// POST /api/progress — upsert progress
router.post("/progress", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { contentType, contentId, episode, progressSeconds, totalSeconds } = req.body;
  if (!contentType || !contentId) {
    res.status(400).json({ error: "contentType and contentId required" });
    return;
  }
  try {
    const existing = await db
      .select()
      .from(watchProgressTable)
      .where(and(eq(watchProgressTable.userId, userId), eq(watchProgressTable.contentType, String(contentType)), eq(watchProgressTable.contentId, String(contentId))))
      .limit(1);

    const values = {
      episode: Number(episode) || 1,
      progressSeconds: Number(progressSeconds) || 0,
      totalSeconds: Number(totalSeconds) || 0,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      const [updated] = await db.update(watchProgressTable).set(values).where(eq(watchProgressTable.id, existing[0].id)).returning();
      res.json(updated);
    } else {
      const [inserted] = await db.insert(watchProgressTable).values({ userId, contentType: String(contentType), contentId: String(contentId), ...values }).returning();
      res.status(201).json(inserted);
    }
  } catch (err: any) {
    req.log.error({ err }, "Failed to save progress");
    res.status(500).json({ error: "Failed to save progress" });
  }
});

export default router;
