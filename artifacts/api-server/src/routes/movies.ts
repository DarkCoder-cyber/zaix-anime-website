import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, moviesTable } from "@workspace/db";
import { eq, desc, ilike, or, and } from "drizzle-orm";

const router: IRouter = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "zaix-anime-secret-key";
const TMDB_KEY = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

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

// ─── In-memory TMDB cache (24h TTL) ──────────────────────────────────────────
const tmdbCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function tmdbFetch(path: string, timeoutMs = 10_000): Promise<any> {
  const cached = tmdbCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  if (!TMDB_KEY) throw new Error("TMDB_API_KEY not configured");

  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ZaixAnime/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
    const data = await res.json();
    tmdbCache.set(path, { data, expiresAt: Date.now() + CACHE_TTL });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

async function dbMovies(genre: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const all = await db
    .select()
    .from(moviesTable)
    .orderBy(desc(moviesTable.createdAt));
  const filtered = genre && genre !== "All"
    ? all.filter((m) => m.genre === genre)
    : all;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  return { movies: filtered.slice(offset, offset + PAGE_SIZE), totalPages, page };
}

async function dbSearch(q: string, page: number) {
  const offset = (page - 1) * PAGE_SIZE;
  const rows = await db
    .select()
    .from(moviesTable)
    .where(ilike(moviesTable.title, `%${q}%`))
    .orderBy(desc(moviesTable.createdAt));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  return { movies: rows.slice(offset, offset + PAGE_SIZE), totalPages, page };
}

// ─── TMDB mappers ─────────────────────────────────────────────────────────────
function mapTmdbGenre(genreIds: number[], lang: string): string {
  if (lang === "hi") return "Bollywood";
  if (["ta", "te", "ml", "kn"].includes(lang)) return "South Indian";
  return "Hollywood";
}

function mapTmdbMovie(m: any, genre?: string): any {
  const lang = m.original_language ?? "hi";
  const langLabel = lang === "hi" ? "Hindi" : lang === "ta" ? "Tamil" : lang === "te" ? "Telugu" : lang === "en" ? "English" : "Hindi";
  return {
    id: m.id,
    tmdbId: m.id,
    title: m.title ?? m.name ?? "Unknown",
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
    streamUrl: "tmdb",
    genre: genre ?? mapTmdbGenre(m.genre_ids ?? [], lang),
    language: langLabel,
    rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    description: m.overview ?? null,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    createdAt: new Date().toISOString(),
  };
}

// ─── GET /api/movies/tmdb/trending ───────────────────────────────────────────
router.get("/movies/tmdb/trending", async (_req: Request, res: Response) => {
  try {
    const [bollywood, tamil, telugu, hollywood] = await Promise.all([
      tmdbFetch(`/discover/movie?with_original_language=hi&sort_by=popularity.desc&page=1&vote_count.gte=50`),
      tmdbFetch(`/discover/movie?with_original_language=ta&sort_by=popularity.desc&page=1&vote_count.gte=30`),
      tmdbFetch(`/discover/movie?with_original_language=te&sort_by=popularity.desc&page=1&vote_count.gte=30`),
      tmdbFetch(`/discover/movie?with_original_language=en&with_genres=28,12,878&sort_by=popularity.desc&page=1&vote_count.gte=100`),
    ]);
    const movies = [
      ...(bollywood.results ?? []).slice(0, 10).map((m: any) => mapTmdbMovie(m, "Bollywood")),
      ...(tamil.results  ?? []).slice(0, 3).map((m: any) => mapTmdbMovie(m, "South Indian")),
      ...(telugu.results ?? []).slice(0, 3).map((m: any) => mapTmdbMovie(m, "South Indian")),
      ...(hollywood.results ?? []).slice(0, 4).map((m: any) => mapTmdbMovie(m, "Hollywood")),
    ];
    res.json({ movies, source: "tmdb" });
  } catch (err) {
    // Fallback: serve the most-recently-synced DB rows as trending
    try {
      const rows = await db.select().from(moviesTable).orderBy(desc(moviesTable.createdAt)).limit(20);
      res.json({ movies: rows, source: "db" });
    } catch {
      res.json({ movies: [], source: "error" });
    }
  }
});

// ─── GET /api/movies/tmdb/bollywood?page=1 ───────────────────────────────────
router.get("/movies/tmdb/bollywood", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  try {
    const data = await tmdbFetch(
      `/discover/movie?with_original_language=hi&sort_by=popularity.desc&page=${page}&vote_count.gte=20`
    );
    const movies = (data.results ?? []).map((m: any) => mapTmdbMovie(m, "Bollywood"));
    res.json({ movies, totalPages: data.total_pages ?? 1, page, source: "tmdb" });
  } catch {
    // Fallback to DB
    const result = await dbMovies("Bollywood", page);
    res.json({ ...result, source: "db" });
  }
});

// ─── GET /api/movies/tmdb/south?page=1 ───────────────────────────────────────
router.get("/movies/tmdb/south", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  try {
    // TMDB only supports one language per call — fetch Tamil & Telugu separately
    const [tamil, telugu] = await Promise.all([
      tmdbFetch(`/discover/movie?with_original_language=ta&sort_by=popularity.desc&page=${page}&vote_count.gte=10`),
      tmdbFetch(`/discover/movie?with_original_language=te&sort_by=popularity.desc&page=${page}&vote_count.gte=10`),
    ]);
    const taRes = tamil.results ?? [];
    const teRes = telugu.results ?? [];
    const merged: any[] = [];
    for (let i = 0; i < Math.max(taRes.length, teRes.length); i++) {
      if (taRes[i]) merged.push(taRes[i]);
      if (teRes[i]) merged.push(teRes[i]);
    }
    const movies = merged.map((m: any) => mapTmdbMovie(m, "South Indian"));
    res.json({
      movies,
      totalPages: Math.max(tamil.total_pages ?? 1, telugu.total_pages ?? 1),
      page,
      source: "tmdb",
    });
  } catch {
    const result = await dbMovies("South Indian", page);
    res.json({ ...result, source: "db" });
  }
});

// ─── GET /api/movies/tmdb/search?q=&genre=&page=1 ────────────────────────────
// Primary text search + genre browse. Falls back to DB if TMDB unreachable.
router.get("/movies/tmdb/search", async (req: Request, res: Response) => {
  const { q, genre, page = "1" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));

  try {
    let results: any[] = [];
    let totalPages = 1;

    if (q && q.trim()) {
      // Full-text TMDB search
      const data = await tmdbFetch(
        `/search/movie?query=${encodeURIComponent(q.trim())}&page=${pageNum}&include_adult=false`
      );
      results = (data.results ?? []).map((m: any) => mapTmdbMovie(m));
      totalPages = data.total_pages ?? 1;
    } else {
      // Genre browse — one language at a time (TMDB limitation)
      const langMap: Record<string, string> = {
        Bollywood: "hi",
        Hollywood: "en",
      };

      if (genre === "South Indian") {
        // South Indian: fetch Tamil only for the search/genre tab
        const data = await tmdbFetch(
          `/discover/movie?with_original_language=ta&sort_by=popularity.desc&page=${pageNum}&vote_count.gte=10`
        );
        results = (data.results ?? []).map((m: any) => mapTmdbMovie(m, "South Indian"));
        totalPages = data.total_pages ?? 1;
      } else {
        const lang = langMap[genre] ?? "hi";
        const data = await tmdbFetch(
          `/discover/movie?with_original_language=${lang}&sort_by=popularity.desc&page=${pageNum}&vote_count.gte=20`
        );
        results = (data.results ?? []).map((m: any) => mapTmdbMovie(m, genre || "Bollywood"));
        totalPages = data.total_pages ?? 1;
      }
    }

    res.json({ movies: results, totalPages, page: pageNum, source: "tmdb" });
  } catch {
    // DB fallback
    if (q && q.trim()) {
      const result = await dbSearch(q.trim(), pageNum);
      res.json({ ...result, source: "db" });
    } else {
      const result = await dbMovies(genre || "All", pageNum);
      res.json({ ...result, source: "db" });
    }
  }
});

// ─── GET /api/movies/tmdb/:tmdbId ────────────────────────────────────────────
router.get("/movies/tmdb/:tmdbId", async (req: Request, res: Response) => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  if (isNaN(tmdbId)) { res.status(400).json({ error: "Invalid tmdb id" }); return; }

  try {
    const m = await tmdbFetch(`/movie/${tmdbId}`);
    res.json({
      movie: {
        id: m.id, tmdbId: m.id,
        title: m.title ?? m.name ?? "Unknown",
        poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
        backdropUrl: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
        streamUrl: "tmdb",
        genre: mapTmdbGenre(m.genres?.map((g: any) => g.id) ?? [], m.original_language ?? "hi"),
        language: m.original_language === "hi" ? "Hindi" : m.original_language === "ta" ? "Tamil" : m.original_language === "te" ? "Telugu" : m.original_language === "en" ? "English" : "Hindi",
        rating: m.vote_average ? m.vote_average.toFixed(1) : null,
        description: m.overview ?? null,
        year: m.release_date ? m.release_date.slice(0, 4) : null,
        runtime: m.runtime ?? null,
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // DB fallback by tmdbId
    const rows = await db.select().from(moviesTable).where(eq(moviesTable.tmdbId, tmdbId)).limit(1);
    if (rows[0]) { res.json({ movie: rows[0] }); return; }
    res.status(404).json({ error: "Movie not found" });
  }
});

// ─── GET /api/movies/stream/:tmdbId ──────────────────────────────────────────
router.get("/movies/stream/:tmdbId", async (req: Request, res: Response) => {
  const tmdbId = parseInt(req.params.tmdbId, 10);
  if (isNaN(tmdbId)) { res.status(400).json({ error: "Invalid tmdb id" }); return; }

  const providers = [
    { name: "VidSrc Pro",  url: `https://vidsrc.pro/embed/movie/${tmdbId}`,              type: "embed" },
    { name: "VidSrc",      url: `https://vidsrc.to/embed/movie/${tmdbId}`,               type: "embed" },
    { name: "2embed",      url: `https://www.2embed.cc/embed/${tmdbId}`,                  type: "embed" },
    { name: "AutoEmbed",   url: `https://player.autoembed.cc/embed/movie/${tmdbId}`,     type: "embed" },
    { name: "VidSrc.me",   url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,          type: "embed" },
    { name: "EmbedSu",     url: `https://embed.su/embed/movie/${tmdbId}`,                type: "embed" },
  ];

  res.json({ providers, tmdbId });
});

// ─── DB-backed routes (admin / legacy) ───────────────────────────────────────

router.get("/movies", async (req: Request, res: Response) => {
  try {
    const { genre } = req.query;
    let rows = await db.select().from(moviesTable).orderBy(desc(moviesTable.createdAt));
    if (genre && typeof genre === "string" && genre !== "All") {
      rows = rows.filter((m) => m.genre === genre);
    }
    res.json({ movies: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

router.get("/movies/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, id)).limit(1);
    if (!movie) { res.status(404).json({ error: "Movie not found" }); return; }
    res.json({ movie });
  } catch {
    res.status(500).json({ error: "Failed to fetch movie" });
  }
});

router.post("/movies", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(403).json({ error: "Forbidden" }); return; }
  try {
    const { title, poster, backdropUrl, streamUrl, tmdbId, genre, language, rating, description, year } = req.body;
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    const [movie] = await db
      .insert(moviesTable)
      .values({
        title, poster: poster || null, backdropUrl: backdropUrl || null,
        streamUrl: streamUrl || "tmdb", tmdbId: tmdbId ? parseInt(tmdbId, 10) : null,
        genre: genre || "Bollywood", language: language || "Hindi",
        rating: rating || null, description: description || null, year: year || null,
      })
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
