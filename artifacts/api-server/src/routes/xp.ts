import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable, chatMessagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getSeasonInfo } from "../utils/season-reset";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";

function getUserId(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId?: number };
    return payload.userId ?? null;
  } catch { return null; }
}

export function computeLevelData(totalXp: number) {
  const level = Math.floor(Math.sqrt(totalXp / 100));
  const currentLevelXp = level * level * 100;
  const nextLevelXp = (level + 1) * (level + 1) * 100;
  const progressXp = totalXp - currentLevelXp;
  const rangeXp = nextLevelXp - currentLevelXp;
  const progressPct = Math.round((progressXp / rangeXp) * 100);
  return { totalXp, level, currentLevelXp, nextLevelXp, progressXp, rangeXp, progressPct };
}

// GET /api/xp — current user's XP + level data
router.get("/xp", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const [user] = await db
    .select({ totalXp: usersTable.totalXp, weeklyXp: usersTable.weeklyXp })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ ...computeLevelData(user.totalXp ?? 0), weeklyXp: user.weeklyXp ?? 0 });
});

// POST /api/xp/award — add XP to current user (max 100 per call)
router.post("/xp/award", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }
  const amount = Math.floor(Number(req.body?.amount) || 0);
  if (amount <= 0 || amount > 100) {
    res.status(400).json({ error: "Amount must be 1–100" }); return;
  }

  // Fetch current XP + username before update to detect level 50 crossing
  const [before] = await db
    .select({ totalXp: usersTable.totalXp, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!before) { res.status(404).json({ error: "User not found" }); return; }

  const prevLevel = Math.floor(Math.sqrt((before.totalXp ?? 0) / 100));

  const [updated] = await db
    .update(usersTable)
    .set({
      totalXp: sql`${usersTable.totalXp} + ${amount}`,
      weeklyXp: sql`${usersTable.weeklyXp} + ${amount}`,
    })
    .where(eq(usersTable.id, userId))
    .returning({ totalXp: usersTable.totalXp, weeklyXp: usersTable.weeklyXp });
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  const newLevel = Math.floor(Math.sqrt((updated.totalXp ?? 0) / 100));

  // 🏆 Level 50 milestone — post a system message to global chat
  if (prevLevel < 50 && newLevel >= 50) {
    try {
      await db.insert(chatMessagesTable).values({
        userName: "SYSTEM",
        message: `🏆 ${before.username} just reached Level 50 — LEGENDARY status! The grind is real. 👑`,
        isAdmin: false,
        isSystem: true,
      });
    } catch { /* non-critical, don't block the response */ }
  }

  res.json({ ...computeLevelData(updated.totalXp ?? 0), weeklyXp: updated.weeklyXp ?? 0 });
});

// GET /api/xp/season — current season info + next reset countdown
router.get("/xp/season", async (_req: Request, res: Response) => {
  try {
    const info = await getSeasonInfo();
    res.json(info);
  } catch {
    res.status(500).json({ error: "Failed to fetch season info" });
  }
});

export default router;
