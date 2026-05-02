import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const JIKAN_BASE = "https://api.jikan.moe/v4";

// AniWatch REST API — open-source, community-hosted
// Docs: https://api-aniwatch.onrender.com
const ANIWATCH_BASE = "https://aniwatch-api-dusky.vercel.app";

async function jikanFetch(path: string) {
  const res = await fetch(`${JIKAN_BASE}${path}`);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status} ${path}`);
  return res.json();
}

async function aniwatchFetch(path: string) {
  const res = await fetch(`${ANIWATCH_BASE}${path}`, {
    headers: { "User-Agent": "ZaixAnime/1.0" },
  });
  if (!res.ok) throw new Error(`AniWatch API error: ${res.status} ${path}`);
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

// GET /api/anime/trending — Top airing anime from Jikan
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

// GET /api/anime/recent — Currently airing this season
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

// GET /api/anime/stream — MUST come before /:malId to avoid route conflict
router.get("/anime/stream", async (req: Request, res: Response) => {
  try {
    const episodeId = String(req.query.episodeId || "").trim();
    if (!episodeId) {
      res.status(400).json({ error: "episodeId is required" });
      return;
    }

    // episodeId format for AniWatch: "{animeId}?ep={episodeNumber}"
    // e.g. "attack-on-titan-112?ep=2277"
    // We proxy the request to AniWatch API
    const category = String(req.query.category || "sub");
    const data = await aniwatchFetch(
      `/anime/episode-srcs?id=${encodeURIComponent(episodeId)}&category=${category}`
    );

    const sources = (data.sources ?? []).map((s: any) => ({
      url: s.url,
      quality: s.quality || "auto",
      isM3U8: Boolean(s.isM3U8) || String(s.url).includes(".m3u8"),
    }));

    if (!sources.length) {
      res.status(404).json({ error: "No streaming sources found for this episode" });
      return;
    }

    res.json({
      sources,
      headers: data.headers ?? {},
      episodeId,
      provider: "aniwatch",
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch episode stream");
    res.status(500).json({ error: "Failed to fetch streaming sources. The episode may not be available." });
  }
});

// GET /api/anime/:malId — Anime detail (must come AFTER /stream route)
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
