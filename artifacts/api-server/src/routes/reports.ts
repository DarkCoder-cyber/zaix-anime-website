import { Router, type IRouter, type Request, type Response } from "express";
import { db, reportsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/reports
router.get("/reports", async (req: Request, res: Response) => {
  try {
    const reports = await db
      .select()
      .from(reportsTable)
      .orderBy(desc(reportsTable.createdAt));
    res.json({ reports });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch reports");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// POST /api/reports
router.post("/reports", async (req: Request, res: Response) => {
  try {
    const { reviewId, contentType, contentId, reportedUser, reviewText, reason, reportedBy } = req.body;
    if (!reviewId || !contentType || !contentId || !reportedUser) {
      res.status(400).json({ error: "Missing required fields: reviewId, contentType, contentId, reportedUser" });
      return;
    }
    const [inserted] = await db
      .insert(reportsTable)
      .values({
        reviewId: Number(reviewId),
        contentType: String(contentType),
        contentId: String(contentId),
        reportedUser: String(reportedUser).trim().slice(0, 50),
        reviewText: reviewText ? String(reviewText).trim().slice(0, 1000) : null,
        reason: String(reason || "inappropriate").slice(0, 100),
        reportedBy: String(reportedBy || "Anonymous").trim().slice(0, 50),
        status: "pending",
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to submit report");
    res.status(500).json({ error: "Failed to submit report" });
  }
});

// PATCH /api/reports/:id — update status
router.patch("/reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { status } = req.body;
    if (!["pending", "resolved", "dismissed"].includes(status)) {
      res.status(400).json({ error: "status must be pending|resolved|dismissed" });
      return;
    }
    const [updated] = await db
      .update(reportsTable)
      .set({ status })
      .where(eq(reportsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    req.log.error({ err }, "Failed to update report");
    res.status(500).json({ error: "Failed to update report" });
  }
});

// DELETE /api/reports/:id
router.delete("/reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const deleted = await db.delete(reportsTable).where(eq(reportsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
