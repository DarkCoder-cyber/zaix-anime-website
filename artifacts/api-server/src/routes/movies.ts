import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, moviesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";

function isAdmin(req: Request): boolean {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    return payload.role === "admin";
  } catch {
    return false;
  }
}

router.get("/movies", async (req: Request, res: Response) => {
  try {
    const { genre } = req.query;
    let rows = await db
      .select()
      .from(moviesTable)
      .orderBy(desc(moviesTable.createdAt));
    if (genre && typeof genre === "string" && genre !== "All") {
      rows = rows.filter((m) => m.genre === genre);
    }
    res.json({ movies: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

router.get("/movies/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [movie] = await db
      .select()
      .from(moviesTable)
      .where(eq(moviesTable.id, id))
      .limit(1);
    if (!movie) { res.status(404).json({ error: "Movie not found" }); return; }
    res.json({ movie });
  } catch {
    res.status(500).json({ error: "Failed to fetch movie" });
  }
});

router.post("/movies", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { title, poster, backdropUrl, streamUrl, genre, language, rating, description } = req.body;
    if (!title || !streamUrl) {
      res.status(400).json({ error: "title and streamUrl are required" }); return;
    }
    const [movie] = await db
      .insert(moviesTable)
      .values({ title, poster: poster || null, backdropUrl: backdropUrl || null, streamUrl, genre: genre || "Bollywood", language: language || "Hindi", rating: rating || null, description: description || null })
      .returning();
    res.status(201).json({ movie });
  } catch {
    res.status(500).json({ error: "Failed to add movie" });
  }
});

router.delete("/movies/:id", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(moviesTable).where(eq(moviesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete movie" });
  }
});

export default router;
