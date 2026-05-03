import { Router, type IRouter, type Request, type Response } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, and, avg, desc, sql } from "drizzle-orm";
import { notifyFiveStarReview } from "../utils/discord";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";

function getUserIdFromReq(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const p = jwt.verify(auth.slice(7), JWT_SECRET) as { userId?: number };
    return p.userId ?? null;
  } catch { return null; }
}

const router: IRouter = Router();

// GET /api/reviews/:contentType/:contentId
router.get("/reviews/:contentType/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    const rows = await db
      .select({
        id: reviewsTable.id,
        contentType: reviewsTable.contentType,
        contentId: reviewsTable.contentId,
        userName: reviewsTable.userName,
        rating: reviewsTable.rating,
        reviewText: reviewsTable.reviewText,
        createdAt: reviewsTable.createdAt,
        userTotalXp: usersTable.totalXp,
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userName, usersTable.username))
      .where(and(eq(reviewsTable.contentType, contentType), eq(reviewsTable.contentId, contentId)))
      .orderBy(desc(reviewsTable.createdAt));

    const avgResult = await db
      .select({ avg: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(and(eq(reviewsTable.contentType, contentType), eq(reviewsTable.contentId, contentId)));

    const averageRating = avgResult[0]?.avg ? parseFloat(avgResult[0].avg as string) : null;

    res.json({
      reviews: rows,
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      total: rows.length,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch reviews");
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// POST /api/reviews/:contentType/:contentId
router.post("/reviews/:contentType/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;
    const { userName, rating, reviewText } = req.body;

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be a number between 1 and 5" });
      return;
    }

    const allowedTypes = ["anime", "manga"];
    if (!allowedTypes.includes(contentType)) {
      res.status(400).json({ error: "contentType must be 'anime' or 'manga'" });
      return;
    }

    const cleanUser = String(userName || "Anonymous").trim().slice(0, 50) || "Anonymous";
    const [inserted] = await db
      .insert(reviewsTable)
      .values({
        contentType,
        contentId,
        userName: cleanUser,
        rating,
        reviewText: reviewText ? String(reviewText).trim().slice(0, 2000) : null,
      })
      .returning();

    if (rating === 5) {
      notifyFiveStarReview(cleanUser, contentType, contentId, inserted.reviewText ?? null).catch(() => {});
    }

    // Award 50 XP to authenticated users who write a review
    const userId = getUserIdFromReq(req);
    if (userId) {
      db.update(usersTable)
        .set({ totalXp: sql`${usersTable.totalXp} + 50` })
        .where(eq(usersTable.id, userId))
        .catch(() => {});
    }

    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Failed to create review" });
  }
});

// DELETE /api/reviews/:id — Admin: delete a specific review by ID
router.delete("/reviews/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid review ID" });
      return;
    }

    const deleted = await db
      .delete(reviewsTable)
      .where(eq(reviewsTable.id, id))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json({ success: true, deleted: deleted[0] });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete review");
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
