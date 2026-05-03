import { Router, type IRouter, type Request, type Response } from "express";
import { db, watchlistTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { extractUserId } from "../lib/auth-helpers";

const router: IRouter = Router();

// GET /api/watchlist — get current user's full watchlist
router.get("/watchlist", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const items = await db
      .select()
      .from(watchlistTable)
      .where(eq(watchlistTable.userId, userId))
      .orderBy(desc(watchlistTable.createdAt));
    res.json({ items });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch watchlist");
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// GET /api/watchlist/check?contentType=anime&contentId=21
router.get("/watchlist/check", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.json({ item: null }); return; }
  const { contentType, contentId } = req.query;
  if (!contentType || !contentId) { res.json({ item: null }); return; }
  try {
    const [item] = await db
      .select()
      .from(watchlistTable)
      .where(
        and(
          eq(watchlistTable.userId, userId),
          eq(watchlistTable.contentType, String(contentType)),
          eq(watchlistTable.contentId, String(contentId)),
        )
      )
      .limit(1);
    res.json({ item: item ?? null });
  } catch (err: any) {
    req.log.error({ err }, "Failed to check watchlist");
    res.json({ item: null });
  }
});

// POST /api/watchlist — add or update item
router.post("/watchlist", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { contentType, contentId, contentTitle, contentImage, contentGenres, status } = req.body;
  if (!contentType || !contentId || !contentTitle) {
    res.status(400).json({ error: "contentType, contentId, contentTitle required" });
    return;
  }
  try {
    const validStatus = ["watching", "completed", "plan_to_watch", "dropped"].includes(status) ? status : "watching";
    const existing = await db
      .select()
      .from(watchlistTable)
      .where(and(eq(watchlistTable.userId, userId), eq(watchlistTable.contentType, String(contentType)), eq(watchlistTable.contentId, String(contentId))))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(watchlistTable)
        .set({ status: validStatus, contentTitle: String(contentTitle), contentImage: contentImage ?? existing[0].contentImage, contentGenres: contentGenres ?? existing[0].contentGenres })
        .where(eq(watchlistTable.id, existing[0].id))
        .returning();
      res.json(updated);
    } else {
      const [inserted] = await db
        .insert(watchlistTable)
        .values({
          userId,
          contentType: String(contentType),
          contentId: String(contentId),
          contentTitle: String(contentTitle).slice(0, 200),
          contentImage: contentImage ? String(contentImage) : null,
          contentGenres: contentGenres ? String(contentGenres) : null,
          status: validStatus,
        })
        .returning();
      res.status(201).json(inserted);
    }
  } catch (err: any) {
    req.log.error({ err }, "Failed to update watchlist");
    res.status(500).json({ error: "Failed to update watchlist" });
  }
});

// DELETE /api/watchlist/:id
router.delete("/watchlist/:id", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const deleted = await db
      .delete(watchlistTable)
      .where(and(eq(watchlistTable.id, id), eq(watchlistTable.userId, userId)))
      .returning();
    if (!deleted.length) { res.status(404).json({ error: "Item not found" }); return; }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete watchlist item");
    res.status(500).json({ error: "Failed to delete watchlist item" });
  }
});

export default router;
