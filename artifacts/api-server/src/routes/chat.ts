import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, chatMessagesTable, chatReactionsTable, usersTable } from "@workspace/db";
import { desc, eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";
const ALLOWED_REACTIONS = new Set(["👍","❤️","😂","🔥","😮"]);

// ── Active user heartbeat tracker ─────────────────────────────────────────────
const ACTIVE_WINDOW_MS = 30_000; // 30 seconds
const heartbeats = new Map<string, number>(); // userName → lastSeenTimestamp

function touchHeartbeat(name: string) {
  heartbeats.set(name, Date.now());
}

function getActiveCount(): number {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  let count = 0;
  for (const [, ts] of heartbeats) {
    if (ts >= cutoff) count++;
  }
  return count;
}

// Purge stale entries every minute
setInterval(() => {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS * 4;
  for (const [name, ts] of heartbeats) {
    if (ts < cutoff) heartbeats.delete(name);
  }
}, 60_000);

async function resolveSender(authHeader: string | undefined): Promise<{ name: string; isAdmin: boolean } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload.admin === true && payload.username) {
      return { name: String(payload.username), isAdmin: true };
    }
    if (typeof payload.userId === "number") {
      const [user] = await db
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1);
      if (user) return { name: user.username, isAdmin: false };
    }
  } catch {
    return null;
  }
  return null;
}

// GET /api/chat — last 100 messages with reactions + active user count
router.get("/chat", async (req: Request, res: Response) => {
  // Register heartbeat for the requesting user (if identified via token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
      if (payload.admin === true && payload.username) {
        touchHeartbeat(String(payload.username));
      } else if (typeof payload.userId === "number") {
        // Use userId as key to avoid a DB lookup on every poll
        touchHeartbeat(`uid:${payload.userId}`);
      }
    } catch {}
  }

  try {
    const msgs = await db
      .select()
      .from(chatMessagesTable)
      .orderBy(desc(chatMessagesTable.createdAt))
      .limit(100);

    const ordered = msgs.reverse();

    const ids = ordered.map((m) => m.id);
    const reactions = ids.length
      ? await db.select().from(chatReactionsTable).where(inArray(chatReactionsTable.messageId, ids))
      : [];

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

    res.json({ messages, activeCount: getActiveCount() });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch chat");
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

// POST /api/chat — send a message (requires valid JWT)
router.post("/chat", async (req: Request, res: Response) => {
  const sender = await resolveSender(req.headers.authorization);
  if (!sender) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { message } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    const [inserted] = await db
      .insert(chatMessagesTable)
      .values({
        userName: sender.name.trim().slice(0, 50),
        message: String(message).trim().slice(0, 500),
        isAdmin: sender.isAdmin,
        isSystem: false,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    req.log.error({ err }, "Failed to post chat message");
    res.status(500).json({ error: "Failed to post chat message" });
  }
});

// POST /api/chat/:id/react — toggle a reaction
router.post("/chat/:id/react", async (req: Request, res: Response) => {
  const sender = await resolveSender(req.headers.authorization);
  if (!sender) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const messageId = parseInt(req.params.id);
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ error: "emoji is required" }); return;
    }
    if (!ALLOWED_REACTIONS.has(emoji)) {
      res.status(400).json({ error: "Emoji not allowed" }); return;
    }
    if (isNaN(messageId)) {
      res.status(400).json({ error: "Invalid message id" }); return;
    }

    const cleanUser = sender.name.trim().slice(0, 50);

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
