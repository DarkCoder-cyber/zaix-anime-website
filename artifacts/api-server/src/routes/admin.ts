import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, reviewsTable, globalAlertsTable } from "@workspace/db";
import { count, eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/admin/analytics
router.get("/admin/analytics", async (req: Request, res: Response) => {
  try {
    const [[usersRes], [reviewsRes]] = await Promise.all([
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(reviewsTable),
    ]);
    res.json({
      totalUsers: Number(usersRes?.count ?? 0),
      totalReviews: Number(reviewsRes?.count ?? 0),
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch analytics");
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// GET /api/admin/alert — active alert (if any)
router.get("/admin/alert", async (req: Request, res: Response) => {
  try {
    const [alert] = await db
      .select()
      .from(globalAlertsTable)
      .where(eq(globalAlertsTable.active, true))
      .orderBy(desc(globalAlertsTable.createdAt))
      .limit(1);
    res.json({ alert: alert ?? null });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch alert");
    res.status(500).json({ error: "Failed to fetch alert" });
  }
});

// POST /api/admin/alert — publish new alert (replaces any active one)
router.post("/admin/alert", async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    await db.update(globalAlertsTable).set({ active: false });
    const [inserted] = await db
      .insert(globalAlertsTable)
      .values({ message: String(message).trim().slice(0, 500), active: true })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create alert");
    res.status(500).json({ error: "Failed to create alert" });
  }
});

// DELETE /api/admin/alert — clear active alert
router.delete("/admin/alert", async (req: Request, res: Response) => {
  try {
    await db.update(globalAlertsTable).set({ active: false });
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to clear alert");
    res.status(500).json({ error: "Failed to clear alert" });
  }
});

export default router;
