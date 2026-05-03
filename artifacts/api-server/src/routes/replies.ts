import { Router, type IRouter, type Request, type Response } from "express";
import { db, reviewRepliesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/reviews/:reviewId/replies
router.get("/reviews/:reviewId/replies", async (req: Request, res: Response) => {
  const reviewId = parseInt(req.params.reviewId);
  if (isNaN(reviewId)) { res.status(400).json({ error: "Invalid reviewId" }); return; }
  try {
    const replies = await db
      .select()
      .from(reviewRepliesTable)
      .where(eq(reviewRepliesTable.reviewId, reviewId))
      .orderBy(reviewRepliesTable.createdAt);
    res.json({ replies });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch replies");
    res.status(500).json({ error: "Failed to fetch replies" });
  }
});

// POST /api/reviews/:reviewId/replies
router.post("/reviews/:reviewId/replies", async (req: Request, res: Response) => {
  const reviewId = parseInt(req.params.reviewId);
  if (isNaN(reviewId)) { res.status(400).json({ error: "Invalid reviewId" }); return; }
  const { userName, replyText, isAdmin } = req.body;
  if (!replyText?.trim()) { res.status(400).json({ error: "replyText is required" }); return; }
  try {
    const [inserted] = await db
      .insert(reviewRepliesTable)
      .values({
        reviewId,
        userName: String(userName || "Anonymous").trim().slice(0, 50) || "Anonymous",
        replyText: String(replyText).trim().slice(0, 1000),
        isAdmin: !!isAdmin,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to post reply");
    res.status(500).json({ error: "Failed to post reply" });
  }
});

// DELETE /api/reviews/replies/:id
router.delete("/reviews/replies/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const deleted = await db.delete(reviewRepliesTable).where(eq(reviewRepliesTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Reply not found" }); return; }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete reply");
    res.status(500).json({ error: "Failed to delete reply" });
  }
});

export default router;
