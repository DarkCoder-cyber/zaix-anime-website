import { db, moviesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const TMDB_KEY = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

async function tmdbGet(path: string): Promise<any> {
  const url = `${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  const res = await fetch(url, { headers: { "User-Agent": "ZaixAnime/1.0", Accept: "application/json" } });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

function mapMovie(m: any, genre: string, language: string) {
  return {
    title: m.title ?? m.name ?? "Unknown",
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : null,
    backdropUrl: m.backdrop_path ? `${TMDB_IMG}/w1280${m.backdrop_path}` : null,
    streamUrl: "tmdb",
    tmdbId: m.id as number,
    genre,
    language,
    rating: m.vote_average ? String(m.vote_average.toFixed(1)) : null,
    description: m.overview ?? null,
    year: m.release_date ? m.release_date.slice(0, 4) : null,
  };
}

async function upsertMovies(movies: ReturnType<typeof mapMovie>[]) {
  let inserted = 0;
  for (const movie of movies) {
    if (!movie.tmdbId) continue;
    const existing = await db
      .select({ id: moviesTable.id })
      .from(moviesTable)
      .where(eq(moviesTable.tmdbId, movie.tmdbId))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(moviesTable).values(movie);
      inserted++;
    }
  }
  return inserted;
}

export async function runTmdbSync() {
  if (!TMDB_KEY) { logger.warn("TMDB_API_KEY not set — skipping sync"); return; }
  logger.info("Starting daily TMDB sync…");
  try {
    const PAGES = 5;
    const allMovies: ReturnType<typeof mapMovie>[] = [];

    // Fetch Bollywood (Hindi)
    for (let p = 1; p <= PAGES; p++) {
      const data = await tmdbGet(`/discover/movie?with_original_language=hi&sort_by=popularity.desc&page=${p}&vote_count.gte=20`);
      for (const m of data.results ?? []) allMovies.push(mapMovie(m, "Bollywood", "Hindi"));
    }

    // Fetch Tamil
    for (let p = 1; p <= PAGES; p++) {
      const data = await tmdbGet(`/discover/movie?with_original_language=ta&sort_by=popularity.desc&page=${p}&vote_count.gte=10`);
      for (const m of data.results ?? []) allMovies.push(mapMovie(m, "South Indian", "Tamil"));
    }

    // Fetch Telugu
    for (let p = 1; p <= PAGES; p++) {
      const data = await tmdbGet(`/discover/movie?with_original_language=te&sort_by=popularity.desc&page=${p}&vote_count.gte=10`);
      for (const m of data.results ?? []) allMovies.push(mapMovie(m, "South Indian", "Telugu"));
    }

    const inserted = await upsertMovies(allMovies);
    logger.info({ total: allMovies.length, inserted }, "TMDB sync complete");
  } catch (err) {
    logger.error({ err }, "TMDB sync failed");
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function scheduleTmdbSync() {
  // Run immediately on startup (after 10s to let DB settle)
  setTimeout(() => {
    runTmdbSync().catch(() => {});
  }, 10_000);

  // Then every 24 hours
  setInterval(() => {
    runTmdbSync().catch(() => {});
  }, DAY_MS);
}
