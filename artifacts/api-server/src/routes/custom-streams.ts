import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { customStreamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";

function verifyAdmin(req: Request): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return payload.admin === true;
  } catch {
    return false;
  }
}

// GET /api/admin/streams — list all custom streams (admin only)
router.get("/admin/streams", async (req: Request, res: Response) => {
  if (!verifyAdmin(req)) { res.status(401).json({ error: "Admin access required" }); return; }
  try {
    const streams = await db
      .select()
      .from(customStreamsTable)
      .orderBy(customStreamsTable.malId, customStreamsTable.episode);
    res.json({ streams });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch custom streams");
    res.status(500).json({ error: "Failed to fetch custom streams" });
  }
});

// POST /api/admin/streams — add a custom stream (admin only)
router.post("/admin/streams", async (req: Request, res: Response) => {
  if (!verifyAdmin(req)) { res.status(401).json({ error: "Admin access required" }); return; }
  const { malId, animeTitle, episode, streamUrl, language, quality, providerLabel } = req.body;
  if (!malId || !animeTitle || !episode || !streamUrl) {
    res.status(400).json({ error: "malId, animeTitle, episode, and streamUrl are required" }); return;
  }
  try {
    const [inserted] = await db
      .insert(customStreamsTable)
      .values({
        malId: Number(malId),
        animeTitle: String(animeTitle).trim(),
        episode: Number(episode),
        streamUrl: String(streamUrl).trim(),
        language: String(language || "hindi").toLowerCase(),
        quality: String(quality || "HD"),
        providerLabel: String(providerLabel || "Custom").trim(),
        addedBy: "admin",
      })
      .returning();
    res.status(201).json({ stream: inserted });
  } catch (err: any) {
    req.log.error({ err }, "Failed to add custom stream");
    res.status(500).json({ error: "Failed to add custom stream" });
  }
});

// DELETE /api/admin/streams/:id — delete a custom stream (admin only)
router.delete("/admin/streams/:id", async (req: Request, res: Response) => {
  if (!verifyAdmin(req)) { res.status(401).json({ error: "Admin access required" }); return; }
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(customStreamsTable).where(eq(customStreamsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete custom stream");
    res.status(500).json({ error: "Failed to delete custom stream" });
  }
});

// GET /api/streams/custom?malId=X&episode=Y — public endpoint for the player
router.get("/streams/custom", async (req: Request, res: Response) => {
  const malId = parseInt(String(req.query.malId));
  const episode = parseInt(String(req.query.episode));
  if (isNaN(malId) || isNaN(episode)) {
    res.status(400).json({ error: "malId and episode are required" }); return;
  }
  try {
    const streams = await db
      .select()
      .from(customStreamsTable)
      .where(and(eq(customStreamsTable.malId, malId), eq(customStreamsTable.episode, episode)));
    res.json({ streams });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch streams");
    res.status(500).json({ error: "Failed to fetch streams" });
  }
});

export default router;
