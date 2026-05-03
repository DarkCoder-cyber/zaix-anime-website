import { Router, type IRouter, type Request, type Response } from "express";
import { HiAnime } from "aniwatch";

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

// Genre name → Jikan genre ID mapping
const GENRE_MAP: Record<string, number> = {
  Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10,
  Horror: 14, Mystery: 7, Romance: 22, "Sci-Fi": 24, "Slice of Life": 36,
  Sports: 30, Supernatural: 37, Thriller: 41, Mecha: 18, School: 23,
  Isekai: 62, Military: 38, Harem: 35, Shounen: 27, Seinen: 42,
};

// In-memory ID mapping cache
const idCache = new Map<number, { data: any; expiresAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function getIdMappings(malId: number): Promise<any> {
  const cached = idCache.get(malId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const res = await fetch(`${ARM_BASE}/ids?source=myanimelist&id=${malId}`);
  if (!res.ok) throw new Error(`ARM API error: ${res.status}`);
  const data = await res.json();
  idCache.set(malId, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

// ─── Doraemon Hindi content registry ─────────────────────────────────────────
// MAL IDs known to have Hindi dub audio on major embed providers
const DORAEMON_MAL_IDS = new Set([
  501,   // Doraemon (1973 original)
  2471,  // Doraemon (2005 TV series) — primary Hindi dubbed run
  2392,  // Doraemon: Nobita's Dinosaur 2006
  2393,  // Doraemon: Nobita and the Windmasters
  2670,  // Doraemon: Nobita's Dorabian Nights
  5096,  // Doraemon: Green Giant Legend
  7045,  // Doraemon: Legend of the Sun King
  10534, // Doraemon: Nobita and the Steel Troops
  14741, // Stand By Me Doraemon
  39537, // Stand By Me Doraemon 2
  23775, // Doraemon: Nobita's Secret Gadget Museum
  28891, // Doraemon: New Nobita's Great Demon
]);

// Known direct Hindi-dubbed stream fallback URLs (sourced & verified)
// Format: malId → { url, label }
const HINDI_FALLBACK_URLS: Record<number, { url: string; label: string }> = {
  2471:  { url: "https://vidsrc.cc/v2/embed/tv/tt1260910/1/1?autoPlay=1", label: "VidSrc.cc Hindi" },
  14741: { url: "https://vidsrc.to/embed/movie/tt3170156",                label: "VidSrc.to Hindi" },
  10534: { url: "https://vidsrc.to/embed/movie/tt2113207",                label: "VidSrc.to Hindi" },
  39537: { url: "https://vidsrc.cc/v2/embed/movie/tt10634486?autoPlay=1", label: "VidSrc.cc Hindi" },
};

function isDoraemonContent(malId: number): boolean {
  return DORAEMON_MAL_IDS.has(malId);
}

function buildProviderUrls(imdbId: string | null, malId: number, episode: number, season: number) {
  const providers: { name: string; url: string; label: string }[] = [];

  if (imdbId) {
    // vidsrc.to — PRIMARY, tested 200, no X-Frame-Options, very reliable
    providers.push({
      name: "vidsrc_to",
      label: "VidSrc.to",
      url: `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`,
    });
  }

  // Self-hosted HLS player via Hianime (consumet) — real HLS, may fail if CF blocks
  providers.push({
    name: "hianime_hls",
    label: "HiAnime HLS",
    url: `/api/anime/player?malId=${malId}&episode=${episode}`,
  });

  if (imdbId) {
    // autoembed.co — tested 200, no X-Frame-Options
    providers.push({
      name: "autoembed",
      label: "AutoEmbed",
      url: `https://autoembed.co/tv/imdb/${imdbId}-${season}-${episode}`,
    });
    // vidsrc.xyz — tested 200, no X-Frame-Options
    providers.push({
      name: "vidsrc_xyz",
      label: "VidSrc",
      url: `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`,
    });
    // 2embed.cc — tested 200
    providers.push({
      name: "2embed",
      label: "2Embed",
      url: `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
    });
    // moviesapi.club — tested 200
    providers.push({
      name: "moviesapi",
      label: "MoviesAPI",
      url: `https://moviesapi.club/tv/${imdbId}-${season}-${episode}`,
    });
    // vidsrc.pro
    providers.push({
      name: "vidsrc_pro",
      label: "VidSrc Pro",
      url: `https://vidsrc.pro/embed/tv/${imdbId}/${season}/${episode}`,
    });
  }

  providers.push({
    name: "animepahe",
    label: "AnimePahe",
    url: `https://animepahe.ru/anime/${malId}`,
  });

  return providers;
}

// Builds a Hindi-prioritised provider list.
// Puts multi-audio capable embeds (VidSrc.to, VidSrc.cc, SuperEmbed, SmashyStream)
// at the front so the user's player picks up Hindi audio first.
function buildHindiProviderUrls(
  imdbId: string | null,
  malId: number,
  episode: number,
  season: number,
  isMovie: boolean,
): { name: string; url: string; label: string }[] {
  const providers: { name: string; url: string; label: string }[] = [];

  if (imdbId) {
    // 1. VidSrc.to — primary multi-audio, Hindi track usually pre-selected for Doraemon
    providers.push({
      name: "vidsrc_to",
      label: "VidSrc.to 🇮🇳",
      url: isMovie
        ? `https://vidsrc.to/embed/movie/${imdbId}`
        : `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`,
    });

    // 2. VidSrc.cc — supports lang param, reliable Hindi audio
    providers.push({
      name: "vidsrc_cc",
      label: "VidSrc.cc 🇮🇳",
      url: isMovie
        ? `https://vidsrc.cc/v2/embed/movie/${imdbId}?autoPlay=1`
        : `https://vidsrc.cc/v2/embed/tv/${imdbId}/${season}/${episode}?autoPlay=1`,
    });

    // 3. SuperEmbed (multiembed.mov) — explicit multi-language support
    providers.push({
      name: "superembed",
      label: "SuperEmbed 🇮🇳",
      url: isMovie
        ? `https://multiembed.mov/?video_id=${imdbId}&tmdb=1`
        : `https://multiembed.mov/?video_id=${imdbId}&tmdb=1&s=${season}&e=${episode}`,
    });

    // 4. SmashyStream — multi-audio embed, well known for Doraemon Hindi
    providers.push({
      name: "smashystream",
      label: "SmashyStream 🇮🇳",
      url: isMovie
        ? `https://embed.smashystream.com/playere.php?imdb=${imdbId}`
        : `https://embed.smashystream.com/playere.php?imdb=${imdbId}&s=${season}&e=${episode}`,
    });

    // 5. 2Embed — fallback
    providers.push({
      name: "2embed",
      label: "2Embed",
      url: isMovie
        ? `https://www.2embed.cc/embed/${imdbId}`
        : `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`,
    });

    // 6. MoviesAPI
    providers.push({
      name: "moviesapi",
      label: "MoviesAPI",
      url: isMovie
        ? `https://moviesapi.club/movie/${imdbId}`
        : `https://moviesapi.club/tv/${imdbId}-${season}-${episode}`,
    });
  }

  // 7. AnimePahe — last resort
  providers.push({
    name: "animepahe",
    label: "AnimePahe",
    url: `https://animepahe.ru/anime/${malId}`,
  });

  return providers;
}

// GET /api/anime/genres — return genre list for filters
router.get("/anime/genres", (_req: Request, res: Response) => {
  res.json({ genres: Object.keys(GENRE_MAP) });
});

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
    if (err?.message?.includes("429")) { res.json({ data: [], pagination: { currentPage: 1, hasNextPage: false, total: 0 } }); return; }
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
    if (err?.message?.includes("429")) { res.json({ data: [], pagination: { currentPage: 1, hasNextPage: false, total: 0 } }); return; }
    req.log.error({ err }, "Failed to fetch recent anime");
    res.status(500).json({ error: "Failed to fetch recent anime" });
  }
});

// GET /api/anime/search?q=...&genre=Action&year=2023&orderBy=score&minScore=7
router.get("/anime/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page || "1")));
    const genre = String(req.query.genre || "").trim();
    const year = parseInt(String(req.query.year || "")) || null;
    const orderBy = String(req.query.orderBy || "").trim(); // score | members | start_date
    const minScore = parseFloat(String(req.query.minScore || "")) || null;

    let jikanUrl = `/anime?q=${encodeURIComponent(q)}&page=${page}&limit=16`;

    if (genre && GENRE_MAP[genre]) {
      jikanUrl += `&genres=${GENRE_MAP[genre]}`;
    }
    if (year) {
      jikanUrl += `&start_date=${year}-01-01&end_date=${year}-12-31`;
    }
    if (minScore && minScore > 0 && minScore <= 10) {
      jikanUrl += `&min_score=${minScore}`;
    }
    if (orderBy === "score" || orderBy === "members" || orderBy === "start_date") {
      jikanUrl += `&order_by=${orderBy}&sort=desc`;
    }

    const data = await jikanFetch(jikanUrl);
    res.json({
      data: (data.data ?? []).map(mapAnimeCard),
      pagination: {
        currentPage: page,
        hasNextPage: data.pagination?.has_next_page ?? false,
        total: data.pagination?.items?.total ?? 0,
      },
    });
  } catch (err: any) {
    if (err?.message?.includes("429")) {
      res.json({ data: [], pagination: { currentPage: 1, hasNextPage: false, total: 0 } });
      return;
    }
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

// In-memory GogoAnime search cache (title → gogoanime id)
const gogoCache = new Map<string, { id: string; expiresAt: number }>();
const GOGO_CACHE_TTL = 6 * 60 * 60 * 1000;

async function resolveHiAnimeStream(title: string, episode: number): Promise<{ hlsSrc: string; subtitles: any[] }> {
  const cacheKey = `hianime:${title}:${episode}`;
  const cached = gogoCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    // cached.id stores the HLS URL directly for Hianime
    return { hlsSrc: cached.id, subtitles: [] };
  }

  // Use consumet ANIME.Hianime (available in v1.8.8)
  // globalThis.require is patched in via the esbuild banner so it works in the ESM bundle
  const consumet = globalThis.require("@consumet/extensions");
  const HiAnimeProvider = consumet.ANIME?.Hianime;
  if (!HiAnimeProvider) throw new Error("Hianime provider not available in @consumet/extensions");
  const hianime = new HiAnimeProvider();

  const results = await hianime.search(title);
  const best = results.results?.[0];
  if (!best?.id) throw new Error(`"${title}" not found on Hianime`);

  const info = await hianime.fetchAnimeInfo(best.id);
  const ep = info.episodes?.[episode - 1];
  if (!ep?.id) throw new Error(`Episode ${episode} not available on Hianime`);

  const sources = await hianime.fetchEpisodeSources(ep.id);
  const hlsSrc = sources.sources?.find((s: any) => s.isM3U8 && s.quality === "auto")?.url
    || sources.sources?.find((s: any) => s.isM3U8)?.url
    || sources.sources?.[0]?.url
    || "";

  if (!hlsSrc) throw new Error("No HLS sources found on Hianime");

  gogoCache.set(cacheKey, { id: hlsSrc, expiresAt: Date.now() + GOGO_CACHE_TTL });
  const subtitles = (sources.subtitles ?? []).filter((s: any) => s.url && s.lang);
  return { hlsSrc, subtitles };
}

function buildPlayerHtml(title: string, episode: number, hlsSrc: string, subtitles: any[], error?: string): string {
  if (error) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;margin:0}
  .icon{font-size:48px;margin-bottom:16px}
  h2{color:#39ff14;margin-bottom:8px;font-size:18px}
  p{color:#888;font-size:13px;margin-bottom:16px;max-width:320px}
  .hint{color:#39ff14;font-size:12px;border:1px solid rgba(57,255,20,.3);padding:8px 16px;border-radius:20px;display:inline-block}
</style></head>
<body><div>
  <div class="icon">📡</div>
  <h2>GogoAnime stream unavailable</h2>
  <p>${error.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c))}</p>
  <span class="hint">Switch to another server above ↑</span>
</div></body></html>`;
  }

  const tracksHtml = subtitles.map((s: any) =>
    `<track kind="subtitles" src="${s.url}" srclang="${s.lang?.slice(0,2) ?? "en"}" label="${s.lang}">`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${title} — Episode ${episode}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { width: 100%; height: 100vh; display: block; object-fit: contain; }
  #status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #39ff14; font-family: sans-serif; font-size: 14px; gap: 12px; pointer-events: none; }
  .spinner { width: 40px; height: 40px; border: 3px solid rgba(57,255,20,.3); border-top-color: #39ff14; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  #err { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; color: #ff4444; font-family: sans-serif; font-size: 14px; gap: 8px; text-align: center; padding: 24px; }
</style>
</head>
<body>
<div id="status"><div class="spinner"></div><span>Loading GogoAnime stream…</span></div>
<div id="err"></div>
<video id="vid" controls crossorigin="anonymous" playsinline preload="auto">
  ${tracksHtml}
</video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js"></script>
<script>
(function() {
  var vid = document.getElementById("vid");
  var status = document.getElementById("status");
  var errEl = document.getElementById("err");
  var src = ${JSON.stringify(hlsSrc)};
  function showErr(msg) {
    status.style.display = "none";
    errEl.style.display = "flex";
    errEl.innerHTML = '<span style="font-size:32px">⚠️</span><strong>Stream error</strong><span style="color:#aaa;font-size:12px">' + msg + '</span><span style="color:#39ff14;font-size:11px;margin-top:8px">Try switching to another server above ↑</span>';
  }
  function onReady() { status.style.display = "none"; }
  vid.addEventListener("canplay", onReady, { once: true });
  if (!src) { showErr("No stream URL resolved"); return; }
  if (window.Hls && Hls.isSupported()) {
    var hls = new Hls({ enableWorker: true, lowLatencyMode: false, xhrSetup: function(xhr) { xhr.withCredentials = false; } });
    hls.loadSource(src);
    hls.attachMedia(vid);
    hls.on(Hls.Events.MANIFEST_PARSED, function() { vid.play().catch(function(){}); onReady(); });
    hls.on(Hls.Events.ERROR, function(_, d) {
      if (d.fatal) showErr("HLS fatal error: " + d.type + " — " + d.details);
    });
  } else if (vid.canPlayType("application/vnd.apple.mpegurl")) {
    vid.src = src;
    vid.addEventListener("loadedmetadata", function() { vid.play().catch(function(){}); });
    vid.addEventListener("error", function() { showErr("Native HLS playback failed"); });
  } else {
    showErr("Your browser does not support HLS playback");
  }
})();
</script>
</body>
</html>`;
}

// GET /api/anime/player?malId=X&episode=Y — self-hosted HLS player via GogoAnime (Consumet)
router.get("/anime/player", async (req: Request, res: Response) => {
  const malId = parseInt(String(req.query.malId || ""));
  const episode = parseInt(String(req.query.episode || "1"));

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");

  let title = "Anime";
  try {
    const jikanData = await jikanFetch(`/anime/${malId}`);
    title = jikanData.data?.title_english || jikanData.data?.title || "Anime";
  } catch { /* Jikan may be rate-limited; carry on */ }

  try {
    const { hlsSrc, subtitles } = await resolveHiAnimeStream(title, episode);
    req.log.info({ malId, episode, hlsSrc: hlsSrc.slice(0, 80) }, "HiAnime stream resolved");
    res.send(buildPlayerHtml(title, episode, hlsSrc, subtitles));
  } catch (err: any) {
    req.log.warn({ err }, "HiAnime player failed, returning error page");
    res.send(buildPlayerHtml(title, episode, "", [], String(err?.message ?? "Could not fetch stream")));
  }
});

// GET /api/anime/stream?malId=...&episode=1&season=1&lang=sub|dub|hindi|raw
router.get("/anime/stream", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(String(req.query.malId || ""));
    const episode = parseInt(String(req.query.episode || "1"));
    const season = parseInt(String(req.query.season || "1"));
    const lang = String(req.query.lang || "sub").toLowerCase();

    if (isNaN(malId) || malId <= 0) {
      res.status(400).json({ error: "malId is required" });
      return;
    }

    const isHindiRequest = lang === "hindi";
    const isDoraemon = isDoraemonContent(malId);

    let imdbId: string | null = null;
    try {
      const mappings = await getIdMappings(malId);
      imdbId = mappings.imdb ?? null;
    } catch {}

    // Determine if this is a movie-type content (Doraemon movies vs TV series)
    // MAL IDs 2471 and 501 are TV series; most others with "movie" in title are movies
    const isMovie = !new Set([501, 2471]).has(malId) && isDoraemon;

    // Build provider list: Hindi-priority for hindi lang + Doraemon, standard otherwise
    const useHindi = isHindiRequest && isDoraemon;
    const providers = useHindi
      ? buildHindiProviderUrls(imdbId, malId, episode, season, isMovie)
      : buildProviderUrls(imdbId, malId, episode, season);

    if (!providers.length) {
      res.status(404).json({ error: "No streaming providers available for this anime" });
      return;
    }

    // Check for known Hindi fallback URL (hardcoded verified sources)
    const hindiFallback = isHindiRequest ? (HINDI_FALLBACK_URLS[malId] ?? null) : null;

    req.log.info(
      { malId, episode, season, lang, isDoraemon, useHindi, imdbId, providers: providers.length },
      "Stream resolved"
    );

    res.json({
      malId,
      episode,
      season,
      lang,
      isHindi: useHindi,
      isDoraemon,
      imdbId,
      embedUrl: providers[0].url,
      providers,
      hindiUrl: hindiFallback?.url ?? null,
      hindiLabel: hindiFallback?.label ?? null,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to resolve stream embed");
    res.status(500).json({ error: "Failed to resolve streaming embed URL" });
  }
});

// GET /api/anime/schedule?day=monday
router.get("/anime/schedule", async (req: Request, res: Response) => {
  try {
    const day = String(req.query.day || "monday").toLowerCase();
    const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    if (!validDays.includes(day)) {
      res.status(400).json({ error: "Invalid day" });
      return;
    }
    const data = await jikanFetch(`/schedules?filter=${day}&limit=25`);
    const items = (data.data ?? []).map((item: any) => ({
      malId: item.mal_id,
      title: item.title_english || item.title,
      image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
      score: item.score ?? null,
      episodes: item.episodes ?? null,
      status: item.status ?? null,
      genres: (item.genres ?? []).map((g: any) => g.name),
      type: item.type ?? null,
      airingTime: item.broadcast?.time ?? null,
      airingDay: item.broadcast?.day ?? day,
      year: item.year ?? null,
    }));
    res.json({ data: items, day });
  } catch (err: any) {
    if (err?.message?.includes("429")) { res.json({ data: [], day: req.query.day || "" }); return; }
    req.log.error({ err }, "Failed to fetch schedule");
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// GET /api/anime/:malId
router.get("/anime/:malId", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(req.params.malId);
    if (isNaN(malId)) {
      res.status(400).json({ error: "Invalid malId" });
      return;
    }
    const data = await jikanFetch(`/anime/${malId}/full`);
    const a = data.data;
    if (!a) { res.status(404).json({ error: "Anime not found" }); return; }
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
    if (err?.message?.includes("429")) { res.status(429).json({ error: "Rate limited, please retry in a moment" }); return; }
    req.log.error({ err }, "Failed to fetch anime detail");
    res.status(500).json({ error: "Failed to fetch anime detail" });
  }
});

// GET /api/anime/:malId/seasons
router.get("/anime/:malId/seasons", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(req.params.malId);
    if (isNaN(malId)) { res.status(400).json({ error: "Invalid malId" }); return; }

    const [animeData, relationsData] = await Promise.all([
      jikanFetch(`/anime/${malId}`),
      jikanFetch(`/anime/${malId}/relations`),
    ]);

    const currentTitle: string = animeData.data?.title_english || animeData.data?.title || "";
    const currentImage = animeData.data?.images?.jpg?.large_image_url || animeData.data?.images?.jpg?.image_url;

    const SEASON_RELATIONS = ["Sequel", "Prequel", "Alternative version", "Parent story", "Full story"];
    const relatedEntries: any[] = [];
    for (const rel of (relationsData.data ?? [])) {
      if (SEASON_RELATIONS.includes(rel.relation)) {
        for (const entry of (rel.entry ?? [])) {
          if (entry.type === "anime") {
            relatedEntries.push({ relation: rel.relation, malId: entry.mal_id, title: entry.name });
          }
        }
      }
    }

    const seasons = [
      { malId, title: currentTitle, image: currentImage, relation: "Current", isCurrent: true },
      ...relatedEntries.map((e) => ({
        malId: e.malId, title: e.title, image: null as string | null,
        relation: e.relation, isCurrent: false,
      })),
    ];

    res.json({ data: seasons, total: seasons.length });
  } catch (err: any) {
    if (err?.message?.includes("429")) {
      res.json({ data: [], total: 0 });
      return;
    }
    req.log.error({ err }, "Failed to fetch seasons");
    res.status(500).json({ error: "Failed to fetch seasons" });
  }
});

// GET /api/anime/:malId/episodes
router.get("/anime/:malId/episodes", async (req: Request, res: Response) => {
  try {
    const malId = parseInt(req.params.malId);
    if (isNaN(malId)) { res.status(400).json({ error: "Invalid malId" }); return; }
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
    if (err?.message?.includes("429")) {
      res.json({ data: [], total: 0 });
      return;
    }
    req.log.error({ err }, "Failed to fetch episodes");
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

export default router;
