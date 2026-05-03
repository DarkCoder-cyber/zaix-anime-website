import { Router, type IRouter, type Request, type Response } from "express";
import { db, chatMessagesTable, chatReactionsTable } from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

const ALLOWED_REACTIONS = new Set(["👍","❤️","😂","🔥","😮"]);

// GET /api/chat — last 100 messages with reactions
router.get("/chat", async (req: Request, res: Response) => {
  try {
    const msgs = await db
      .select()
      .from(chatMessagesTable)
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);

    const ordered = msgs.reverse();

    // Aggregate reactions for returned messages
    const ids = ordered.map((m) => m.id);
    const reactions = ids.length
      ? await db.select().from(chatReactionsTable).where(inArray(chatReactionsTable.messageId, ids))
      : [];

    // Group: messageId → emoji → { count, users[] }
    const grouped: Record<number, Record<string, { count: number; users: string[] }>> = {};
    for (const r of reactions) {
      if (!grouped[r.messageId]) grouped[r.messageId] = {};
      if (!grouped[r.messageId][r.emoji]) grouped[r.messageId][r.emoji] = { count: 0, users: [] };
      grouped[r.messageId][r.emoji].count++;
      grouped[r.messageId][r.emoji].users.push(r.userName);
    }

    const messages = ordered.map((m) => ({
      ...m,
      reactions: Object.entries(grouped[m.id] ?? {}).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        users: data.users,
      })),
    }));

    res.json({ messages });
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

// POST /api/chat/:id/react — toggle a reaction (returns updated reaction list for that message)
router.post("/chat/:id/react", async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id);
    const { userName, emoji } = req.body;

    if (!userName?.trim() || !emoji) {
      res.status(400).json({ error: "userName and emoji are required" }); return;
    }
    if (!ALLOWED_REACTIONS.has(emoji)) {
      res.status(400).json({ error: "Emoji not allowed" }); return;
    }
    if (isNaN(messageId)) {
      res.status(400).json({ error: "Invalid message id" }); return;
    }

    const cleanUser = String(userName).trim().slice(0, 50);

    // Toggle: delete if exists, insert if not
    const [existing] = await db
      .select({ id: chatReactionsTable.id })
      .from(chatReactionsTable)
      .where(
        and(
          eq(chatReactionsTable.messageId, messageId),
          eq(chatReactionsTable.userName, cleanUser),
          eq(chatReactionsTable.emoji, emoji),
        )
      )
      .limit(1);

    if (existing) {
      await db.delete(chatReactionsTable).where(eq(chatReactionsTable.id, existing.id));
    } else {
      await db.insert(chatReactionsTable).values({ messageId, userName: cleanUser, emoji });
    }

    // Return updated reactions for this message
    const updated = await db
      .select()
      .from(chatReactionsTable)
      .where(eq(chatReactionsTable.messageId, messageId));

    const grouped: Record<string, { count: number; users: string[] }> = {};
    for (const r of updated) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.userName);
    }
    const reactions = Object.entries(grouped).map(([emoji, data]) => ({
      emoji, count: data.count, users: data.users,
    }));

    res.json({ reacted: !existing, reactions });
  } catch (err: any) {
    req.log.error({ err }, "Failed to toggle reaction");
    res.status(500).json({ error: "Failed to toggle reaction" });
  }
});

export { router as chatRouter };
export default router;
