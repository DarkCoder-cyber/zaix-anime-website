import { Router, type IRouter, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { db, moviesTable } from "@workspace/db";
import { eq, desc, isNotNull } from "drizzle-orm";

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

// In-memory TMDB response cache (24h TTL)
const tmdbCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function tmdbFetch(path: string): Promise<any> {
  const key = path;
  const cached = tmdbCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ZaixAnime/1.0", "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${path}`);
  const data = await res.json();
  tmdbCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

function mapTmdbGenre(genreIds: number[], originalLanguage: string): string {
  if (originalLanguage === "hi") {
    const actionIds = [28, 80, 53, 10752];
    const romanceIds = [10749, 35];
    const dramaIds = [18];
    if (genreIds.some((g) => actionIds.includes(g))) return "Bollywood";
    if (genreIds.some((g) => romanceIds.includes(g))) return "Bollywood";
    if (genreIds.some((g) => dramaIds.includes(g))) return "Bollywood";
    return "Bollywood";
  }
  if (originalLanguage === "ta" || originalLanguage === "te" || originalLanguage === "ml" || originalLanguage === "kn") {
    return "South Indian";
  }
  return "Hollywood";
}

function mapTmdbMovie(m: any, genre?: string): any {
  const lang = m.original_language ?? "hi";
  return {
    id: m.id,
    tmdbId: m.id,
    title: m.title ?? m.name ?? "Unknown",
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
    streamUrl: "tmdb",
    genre: genre ?? mapTmdbGenre(m.genre_ids ?? [], lang),
    language: lang === "hi" ? "Hindi" : lang === "ta" ? "Tamil" : lang === "te" ? "Telugu" : lang === "en" ? "English" : "Hindi",
    rating: m.vote_average ? m.vote_average.toFixed(1) : null,
    description: m.overview ?? null,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    createdAt: new Date().toISOString(),
  };
}

// ─── TMDB browse endpoints ────────────────────────────────────────────────────

// GET /api/movies/tmdb/trending — fetch trending movies from TMDB
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
      ...(tamil.results ?? []).slice(0, 3).map((m: any) => mapTmdbMovie(m, "South Indian")),
      ...(telugu.results ?? []).slice(0, 3).map((m: any) => mapTmdbMovie(m, "South Indian")),
      ...(hollywood.results ?? []).slice(0, 4).map((m: any) => mapTmdbMovie(m, "Hollywood")),
    ];
    res.json({ movies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending movies" });
  }
});

// GET /api/movies/tmdb/search?q=query&genre=Bollywood&page=1
router.get("/movies/tmdb/search", async (req: Request, res: Response) => {
  try {
    const { q, genre, page = "1" } = req.query as Record<string, string>;
    let results: any[] = [];

    if (q && q.trim()) {
      const data = await tmdbFetch(`/search/movie?query=${encodeURIComponent(q)}&page=${page}&include_adult=false`);
      results = (data.results ?? []).map((m: any) => mapTmdbMovie(m));
    } else {
      const langMap: Record<string, string> = {
        "Bollywood": "hi",
        "South Indian": "ta,te",
        "Hollywood": "en",
      };
      const lang = genre && langMap[genre] ? langMap[genre] : "hi";
      const data = await tmdbFetch(`/discover/movie?with_original_language=${lang}&sort_by=popularity.desc&page=${page}&vote_count.gte=20`);
      results = (data.results ?? []).map((m: any) => mapTmdbMovie(m, genre as string));
    }

    res.json({ movies: results });
  } catch (err) {
    res.status(500).json({ error: "Failed to search movies" });
  }
});

// GET /api/movies/tmdb/bollywood?page=1 — paginated Bollywood catalogue
router.get("/movies/tmdb/bollywood", async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? "1", 10);
    const data = await tmdbFetch(`/discover/movie?with_original_language=hi&sort_by=popularity.desc&page=${page}&vote_count.gte=20`);
    const movies = (data.results ?? []).map((m: any) => mapTmdbMovie(m, "Bollywood"));
    res.json({ movies, totalPages: data.total_pages, page: data.page });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch Bollywood movies" });
  }
});

// GET /api/movies/tmdb/south?page=1 — South Indian catalogue (Tamil + Telugu)
router.get("/movies/tmdb/south", async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) ?? "1", 10);
    // TMDB only supports one language at a time; fetch Tamil and Telugu separately
    const [tamil, telugu] = await Promise.all([
      tmdbFetch(`/discover/movie?with_original_language=ta&sort_by=popularity.desc&page=${page}&vote_count.gte=10`),
      tmdbFetch(`/discover/movie?with_original_language=te&sort_by=popularity.desc&page=${page}&vote_count.gte=10`),
    ]);
    // Interleave results for variety
    const taResults = tamil.results ?? [];
    const teResults = telugu.results ?? [];
    const merged: any[] = [];
    const maxLen = Math.max(taResults.length, teResults.length);
    for (let i = 0; i < maxLen; i++) {
      if (taResults[i]) merged.push(taResults[i]);
      if (teResults[i]) merged.push(teResults[i]);
    }
    const movies = merged.map((m: any) => mapTmdbMovie(m, "South Indian"));
    res.json({ movies, totalPages: Math.max(tamil.total_pages ?? 1, telugu.total_pages ?? 1), page });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch South Indian movies" });
  }
});

// GET /api/movies/tmdb/:tmdbId — single movie detail from TMDB
router.get("/movies/tmdb/:tmdbId", async (req: Request, res: Response) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId, 10);
    if (isNaN(tmdbId)) { res.status(400).json({ error: "Invalid tmdb id" }); return; }
    const m = await tmdbFetch(`/movie/${tmdbId}`);
    const movie = {
      id: m.id,
      tmdbId: m.id,
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
    };
    res.json({ movie });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

// ─── Embed stream providers ───────────────────────────────────────────────────
// GET /api/movies/stream/:tmdbId — return list of embed player URLs
router.get("/movies/stream/:tmdbId", async (req: Request, res: Response) => {
  try {
    const tmdbId = parseInt(req.params.tmdbId, 10);
    if (isNaN(tmdbId)) { res.status(400).json({ error: "Invalid tmdb id" }); return; }

    const providers = [
      {
        name: "VidSrc Pro",
        url: `https://vidsrc.pro/embed/movie/${tmdbId}`,
        type: "embed",
      },
      {
        name: "VidSrc",
        url: `https://vidsrc.to/embed/movie/${tmdbId}`,
        type: "embed",
      },
      {
        name: "2embed",
        url: `https://www.2embed.cc/embed/${tmdbId}`,
        type: "embed",
      },
      {
        name: "AutoEmbed",
        url: `https://player.autoembed.cc/embed/movie/${tmdbId}`,
        type: "embed",
      },
      {
        name: "VidSrc.me",
        url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
        type: "embed",
      },
      {
        name: "EmbedSu",
        url: `https://embed.su/embed/movie/${tmdbId}`,
        type: "embed",
      },
    ];

    res.json({ providers, tmdbId });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stream providers" });
  }
});

// ─── Legacy DB-backed routes ──────────────────────────────────────────────────

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
    const { title, poster, backdropUrl, streamUrl, tmdbId, genre, language, rating, description, year } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" }); return;
    }
    const [movie] = await db
      .insert(moviesTable)
      .values({
        title,
        poster: poster || null,
        backdropUrl: backdropUrl || null,
        streamUrl: streamUrl || "tmdb",
        tmdbId: tmdbId ? parseInt(tmdbId, 10) : null,
        genre: genre || "Bollywood",
        language: language || "Hindi",
        rating: rating || null,
        description: description || null,
        year: year || null,
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
