import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { streamReportsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// POST /api/stream-reports — user reports a broken stream
router.post("/stream-reports", async (req: Request, res: Response) => {
  try {
    const { malId, animeTitle, episode, provider, providerLabel, reportedBy } = req.body;
    if (!malId || !episode || !provider || !providerLabel) {
      res.status(400).json({ error: "Missing required fields: malId, episode, provider, providerLabel" });
      return;
    }
    const [inserted] = await db
      .insert(streamReportsTable)
      .values({
        malId: Number(malId),
        animeTitle: String(animeTitle || "Unknown").trim().slice(0, 200),
        episode: Number(episode),
        provider: String(provider).trim().slice(0, 50),
        providerLabel: String(providerLabel).trim().slice(0, 100),
        reportedBy: String(reportedBy || "Anonymous").trim().slice(0, 50),
        status: "pending",
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to submit stream report");
    res.status(500).json({ error: "Failed to submit stream report" });
  }
});

// GET /api/stream-reports — admin view
router.get("/stream-reports", async (req: Request, res: Response) => {
  try {
    const reports = await db
      .select()
      .from(streamReportsTable)
      .orderBy(desc(streamReportsTable.createdAt));
    res.json({ reports });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch stream reports");
    res.status(500).json({ error: "Failed to fetch stream reports" });
  }
});

// PATCH /api/stream-reports/:id — mark resolved/dismissed
router.patch("/stream-reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const { status } = req.body;
    if (!["pending", "resolved", "dismissed"].includes(status)) {
      res.status(400).json({ error: "status must be pending|resolved|dismissed" });
      return;
    }
    const [updated] = await db
      .update(streamReportsTable)
      .set({ status })
      .where(eq(streamReportsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    req.log.error({ err }, "Failed to update stream report");
    res.status(500).json({ error: "Failed to update stream report" });
  }
});

// DELETE /api/stream-reports/:id
router.delete("/stream-reports/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
    const deleted = await db.delete(streamReportsTable).where(eq(streamReportsTable.id, id)).returning();
    if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete stream report");
    res.status(500).json({ error: "Failed to delete stream report" });
  }
});

export default router;
