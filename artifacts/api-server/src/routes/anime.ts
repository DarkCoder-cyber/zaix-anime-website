import { Router, type IRouter, type Request, type Response } from "express";
import { HiAnime } from "aniwatch";

const router: IRouter = Router();
const hianime = new HiAnime.Scraper();

const JIKAN_BASE = "https://api.jikan.moe/v4";

async function jikanFetch(path: string) {
  const res = await fetch(`${JIKAN_BASE}${path}`);
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

// In-memory cache: malId -> hiAnimeId (persists for process lifetime, refreshed daily via TTL)
const hiAnimeIdCache = new Map<number, { id: string; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function getHiAnimeId(malId: number, title: string): Promise<string | null> {
  const cached = hiAnimeIdCache.get(malId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.id;
  }

  try {
    // Search HiAnime by title and find the entry with matching malID
    const results = await hianime.search(title, 1);
    const animes = results.animes ?? [];

    // Try to match by checking episode sources which returns malID
    // First try exact name match or pick the first result
    let hiAnimeId: string | null = null;

    for (const anime of animes.slice(0, 3)) {
      try {
        // Get first episode to check malID match
        const eps = await hianime.getEpisodes(anime.id);
        if (eps.episodes && eps.episodes.length > 0) {
          const firstEpId = eps.episodes[0].episodeId;
          const src = await hianime.getEpisodeSources(firstEpId, HiAnime.Servers.VidStreaming, "sub");
          if (src.malID === malId) {
            hiAnimeId = anime.id;
            break;
          }
        }
      } catch {
        // continue trying
      }
    }

    // If no exact malID match, fall back to closest name match
    if (!hiAnimeId && animes.length > 0) {
      hiAnimeId = animes[0].id;
    }

    if (hiAnimeId) {
      hiAnimeIdCache.set(malId, { id: hiAnimeId, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return hiAnimeId;
  } catch (err) {
    return null;
  }
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

// GET /api/anime/stream?episodeId=...&category=sub|dub
// episodeId is the real HiAnime episodeId, e.g. "steinsgate-3?ep=230"
// MUST be before /:malId route
router.get("/anime/stream", async (req: Request, res: Response) => {
  try {
    const episodeId = String(req.query.episodeId || "").trim();
    if (!episodeId) {
      res.status(400).json({ error: "episodeId is required" });
      return;
    }

    const category = (String(req.query.category || "sub")) as "sub" | "dub" | "raw";

    // Try multiple servers in priority order
    const servers = [
      HiAnime.Servers.VidStreaming,
      HiAnime.Servers.MegaCloud,
      HiAnime.Servers.Streamtape,
    ];

    let lastErr: any = null;
    for (const server of servers) {
      try {
        const data = await hianime.getEpisodeSources(episodeId, server, category);

        const sources = (data.sources ?? []).map((s: any) => ({
          url: s.url,
          quality: s.quality || "auto",
          isM3U8: Boolean(s.isM3U8) || String(s.url).includes(".m3u8"),
        }));

        if (!sources.length) continue;

        const subtitles = (data.subtitles ?? []).map((st: any) => ({
          url: st.url,
          lang: st.lang,
          default: st.default ?? false,
        }));

        res.json({
          sources,
          headers: data.headers ?? {},
          subtitles,
          episodeId,
          server: String(server),
          malID: data.malID ?? null,
          anilistID: data.anilistID ?? null,
        });
        return;
      } catch (err) {
        lastErr = err;
        continue;
      }
    }

    req.log.error({ err: lastErr, episodeId }, "All servers failed for episode");
    res.status(502).json({ error: "No streaming sources found. The episode may not be available." });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch episode stream");
    res.status(500).json({ error: "Failed to fetch streaming sources." });
  }
});

// GET /api/anime/hianime-id?malId=21&title=One+Piece
// Returns the HiAnime ID for a given MAL ID (with 24h cache)
// MUST be before /:malId route
router.get("/anime/hianime-id", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(String(req.query.malId || ""));
    const title = String(req.query.title || "").trim();

    if (isNaN(malId) || !title) {
      res.status(400).json({ error: "malId and title are required" });
      return;
    }

    const hiAnimeId = await getHiAnimeId(malId, title);
    if (!hiAnimeId) {
      res.status(404).json({ error: "HiAnime ID not found for this anime" });
      return;
    }

    res.json({ malId, hiAnimeId });
  } catch (err: any) {
    req.log.error({ err }, "Failed to resolve HiAnime ID");
    res.status(500).json({ error: "Failed to resolve HiAnime ID" });
  }
});

// GET /api/anime/hianime-episodes?hiAnimeId=steinsgate-3
// Returns episodes with real episodeIds from HiAnime (NOT from Jikan)
// MUST be before /:malId route
router.get("/anime/hianime-episodes", async (req: Request, res: Response) => {
  try {
    const hiAnimeId = String(req.query.hiAnimeId || "").trim();
    if (!hiAnimeId) {
      res.status(400).json({ error: "hiAnimeId is required" });
      return;
    }

    const data = await hianime.getEpisodes(hiAnimeId);
    const episodes = (data.episodes ?? []).map((ep: any) => ({
      number: ep.number,
      episodeId: ep.episodeId,
      title: ep.title ?? null,
      isFiller: ep.isFiller ?? false,
    }));

    res.json({
      hiAnimeId,
      totalEpisodes: data.totalEpisodes ?? episodes.length,
      episodes,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch HiAnime episodes");
    res.status(500).json({ error: "Failed to fetch episodes from streaming source" });
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

// GET /api/anime/:malId/episodes — Jikan episode list (titles, aired dates, filler flags)
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
