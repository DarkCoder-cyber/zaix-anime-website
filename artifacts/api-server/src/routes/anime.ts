import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const JIKAN_BASE = "https://api.jikan.moe/v4";
const ARM_BASE = "https://arm.haglund.dev/api/v2";

async function jikanFetch(path: string) {
  const res = await fetch(`${JIKAN_BASE}${path}`, {
    headers: { "User-Agent": "ZaixAnime/1.0" },
  });
  if (!res.ok) throw new Error(`Jikan API error: ${res.status} ${path}`);
  return res.json();
}

function mapAnimeCard(item: any) {
  return {
    malId: item.mal_id,
    title: item.title_english || item.title,
    image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
    score: item.score ?? null,
    episodes: item.episodes ?? null,
    status: item.status ?? null,
    genres: (item.genres ?? []).map((g: any) => g.name),
    synopsis: item.synopsis ?? null,
    year: item.year ?? null,
    type: item.type ?? null,
  };
}

// In-memory ID mapping cache (MAL ID → {imdbId, anilistId, ...}) — refreshed daily
const idCache = new Map<number, { data: any; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getIdMappings(malId: number): Promise<any> {
  const cached = idCache.get(malId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const res = await fetch(`${ARM_BASE}/ids?source=myanimelist&id=${malId}`);
  if (!res.ok) throw new Error(`ARM API error: ${res.status}`);
  const data = await res.json();
  idCache.set(malId, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

// Build all provider embed URLs for a given set of IDs
function buildProviderUrls(imdbId: string | null, malId: number, episode: number, season: number) {
  const providers: { name: string; url: string; label: string }[] = [];

  // 2embed — works with IMDB IDs for TV shows
  if (imdbId) {
    providers.push({
      name: "2embed",
      label: "2Embed",
      url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
    });
  }

  // embed.su — works with IMDB IDs
  if (imdbId) {
    providers.push({
      name: "embedsu",
      label: "EmbedSu",
      url: `https://embed.su/embed/tv/${imdbId}/${season}/${episode}`,
    });
  }

  // vidsrc.xyz — alternative vidsrc that is still active
  if (imdbId) {
    providers.push({
      name: "vidsrc_xyz",
      label: "VidSrc",
      url: `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`,
    });
  }

  // smashystream — works with IMDB
  if (imdbId) {
    providers.push({
      name: "smashystream",
      label: "SmashyStream",
      url: `https://player.smashy.stream/tv/${imdbId}?s=${season}&e=${episode}`,
    });
  }

  // anime-specific: aniwatchtv via AllAnime embed (MAL-based), no IMDB needed
  providers.push({
    name: "animepahe",
    label: "AnimePahe",
    url: `https://animepahe.ru/anime/${malId}`,
  });

  return providers;
}

// GET /api/anime/trending
router.get("/anime/trending", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(25, parseInt(String(req.query.limit || "16")));
    const data = await jikanFetch(`/top/anime?filter=airing&page=${page}&limit=${limit}`);
    res.json({
      data: (data.data ?? []).map(mapAnimeCard),
      pagination: {
        currentPage: page,
        hasNextPage: data.pagination?.has_next_page ?? false,
        total: data.pagination?.items?.total ?? 0,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch trending anime");
    res.status(500).json({ error: "Failed to fetch trending anime" });
  }
});

// GET /api/anime/recent
router.get("/anime/recent", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const limit = Math.min(25, parseInt(String(req.query.limit || "16")));
    const data = await jikanFetch(`/seasons/now?page=${page}&limit=${limit}`);
    res.json({
      data: (data.data ?? []).map(mapAnimeCard),
      pagination: {
        currentPage: page,
        hasNextPage: data.pagination?.has_next_page ?? false,
        total: data.pagination?.items?.total ?? 0,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch recent anime");
    res.status(500).json({ error: "Failed to fetch recent anime" });
  }
});

// GET /api/anime/search?q=...
router.get("/anime/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const data = await jikanFetch(`/anime?q=${encodeURIComponent(q)}&page=${page}&limit=16`);
    res.json({
      data: (data.data ?? []).map(mapAnimeCard),
      pagination: {
        currentPage: page,
        hasNextPage: data.pagination?.has_next_page ?? false,
        total: data.pagination?.items?.total ?? 0,
      },
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to search anime");
    res.status(500).json({ error: "Failed to search anime" });
  }
});

// GET /api/anime/ids?malId=...
router.get("/anime/ids", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(String(req.query.malId || ""));
    if (isNaN(malId) || malId <= 0) {
      res.status(400).json({ error: "Valid malId is required" });
      return;
    }
    const mappings = await getIdMappings(malId);
    res.json({
      malId,
      imdbId: mappings.imdb ?? null,
      anilistId: mappings.anilist ?? null,
      kitsuId: mappings.kitsu ?? null,
      tmdbId: mappings.themoviedb ?? null,
      thetvdbId: mappings.thetvdb ?? null,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch ID mappings");
    res.status(500).json({ error: "Could not resolve streaming IDs for this anime" });
  }
});

// GET /api/anime/stream?malId=...&episode=1&season=1
// Returns multiple embed URLs from different providers — ready to load in an iframe
// MUST be before /:malId
router.get("/anime/stream", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(String(req.query.malId || ""));
    const episode = parseInt(String(req.query.episode || "1"));
    const season = parseInt(String(req.query.season || "1"));

    if (isNaN(malId) || malId <= 0) {
      res.status(400).json({ error: "malId is required" });
      return;
    }

    // Try to get IMDB ID from ARM (best effort — some anime have no mapping)
    let imdbId: string | null = null;
    try {
      const mappings = await getIdMappings(malId);
      imdbId = mappings.imdb ?? null;
    } catch {
      // ARM lookup failed — continue with MAL-only providers
    }

    const providers = buildProviderUrls(imdbId, malId, episode, season);

    if (!providers.length) {
      res.status(404).json({ error: "No streaming providers available for this anime" });
      return;
    }

    res.json({
      malId,
      episode,
      season,
      imdbId,
      // Primary embed URL (first available provider)
      embedUrl: providers[0].url,
      // All provider options for the frontend switcher
      providers,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to resolve stream embed");
    res.status(500).json({ error: "Failed to resolve streaming embed URL" });
  }
});

// GET /api/anime/:malId — Anime detail (must come AFTER static routes)
router.get("/anime/:malId", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(req.params.malId);
    if (isNaN(malId)) {
      res.status(400).json({ error: "Invalid malId" });
      return;
    }
    const data = await jikanFetch(`/anime/${malId}/full`);
    const a = data.data;
    if (!a) {
      res.status(404).json({ error: "Anime not found" });
      return;
    }
    res.json({
      malId: a.mal_id,
      title: a.title_english || a.title,
      titleEnglish: a.title_english ?? null,
      image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
      trailer: a.trailer?.embed_url ?? null,
      score: a.score ?? null,
      scored_by: a.scored_by ?? null,
      rank: a.rank ?? null,
      episodes: a.episodes ?? null,
      status: a.status ?? null,
      aired: a.aired?.string ?? null,
      duration: a.duration ?? null,
      rating: a.rating ?? null,
      genres: (a.genres ?? []).map((g: any) => g.name),
      synopsis: a.synopsis ?? null,
      background: a.background ?? null,
      studios: (a.studios ?? []).map((s: any) => s.name),
      type: a.type ?? null,
      year: a.year ?? null,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch anime detail");
    res.status(500).json({ error: "Failed to fetch anime detail" });
  }
});

// GET /api/anime/:malId/episodes
router.get("/anime/:malId/episodes", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(req.params.malId);
    if (isNaN(malId)) {
      res.status(400).json({ error: "Invalid malId" });
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const data = await jikanFetch(`/anime/${malId}/episodes?page=${page}`);
    res.json({
      data: (data.data ?? []).map((ep: any) => ({
        malId: ep.mal_id,
        number: ep.mal_id,
        title: ep.title ?? null,
        aired: ep.aired ?? null,
        score: ep.score ?? null,
        filler: ep.filler ?? false,
        recap: ep.recap ?? false,
      })),
      total: data.pagination?.items?.total ?? data.data?.length ?? 0,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch episodes");
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

export default router;
