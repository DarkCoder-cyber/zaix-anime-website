import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { extractUserId } from "../lib/auth-helpers";

const router: IRouter = Router();

// GET /api/notifications
router.get("/notifications", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const items = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json({ notifications: items });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch notifications");
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// POST /api/notifications — create a notification for the current user
router.post("/notifications", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const { type, title, message, animeId } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }
  try {
    const [inserted] = await db
      .insert(notificationsTable)
      .values({
        userId,
        type: String(type || "info"),
        title: String(title).slice(0, 200),
        message: String(message).slice(0, 500),
        animeId: animeId ? String(animeId) : null,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create notification");
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// PATCH /api/notifications/:id/read — mark single notification read
router.patch("/notifications/:id/read", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "Failed to mark read" });
  }
});

// POST /api/notifications/read-all — mark all read
router.post("/notifications/read-all", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.userId, userId));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to mark all read");
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

// DELETE /api/notifications — clear all for user
router.delete("/notifications", async (req: Request, res: Response) => {
  const userId = extractUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    await db
      .delete(notificationsTable)
      .where(eq(notificationsTable.userId, userId));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to clear notifications");
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
