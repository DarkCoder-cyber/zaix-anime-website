import { Router, type IRouter, type Request, type Response } from "express";
import { db, chatMessagesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/chat — last 100 messages (oldest first)
router.get("/chat", async (req: Request, res: Response) => {
  try {
    const msgs = await db
      .select()
      .from(chatMessagesTable)
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);
    res.json({ messages: msgs.reverse() });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch chat");
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

// POST /api/chat — send a message
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { userName, message, isAdmin } = req.body;
    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    const [inserted] = await db
      .insert(chatMessagesTable)
      .values({
        userName: String(userName || "Anonymous").trim().slice(0, 50) || "Anonymous",
        message: String(message).trim().slice(0, 500),
        isAdmin: !!isAdmin,
        isSystem: false,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to post chat message");
    res.status(500).json({ error: "Failed to post chat message" });
  }
});

export { router as chatRouter };
export default router;
