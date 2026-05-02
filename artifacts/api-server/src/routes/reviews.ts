import { Router, type IRouter, type Request, type Response } from "express";
import { db, reviewsTable } from "@workspace/db";
import { eq, and, avg, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/reviews/:contentType/:contentId
router.get("/reviews/:contentType/:contentId", async (req: Request, res: Response) => {
  try {
    const { contentType, contentId } = req.params;

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.contentType, contentType),
          eq(reviewsTable.contentId, contentId)
        )
      )
      .orderBy(desc(reviewsTable.createdAt));

    const avgResult = await db
      .select({ avg: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.contentType, contentType),
          eq(reviewsTable.contentId, contentId)
        )
      );

    const averageRating = avgResult[0]?.avg ? parseFloat(avgResult[0].avg as string) : null;

    res.json({
      reviews,
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
      total: reviews.length,
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

    const [inserted] = await db
      .insert(reviewsTable)
      .values({
        contentType,
        contentId,
        userName: String(userName || "Anonymous").trim().slice(0, 50) || "Anonymous",
        rating,
        reviewText: reviewText ? String(reviewText).trim().slice(0, 2000) : null,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create review");
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
