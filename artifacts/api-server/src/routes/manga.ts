import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const MANGADEX_BASE = "https://api.mangadex.org";
const ALLOWED_IMAGE_HOSTS = [
  "uploads.mangadex.org",
  "mangadex.network",
  "s5.mangadex.org",
];

function proxyImageUrl(directUrl: string): string {
  return `/api/proxy/image?url=${encodeURIComponent(directUrl)}`;
}

function getCoverUrl(mangaId: string, coverFilename: string): string {
  // MangaDex cover format: uploads.mangadex.org/covers/{mangaId}/{filename}
  // Thumbnail: append .256.jpg or .512.jpg to the full filename (e.g. "cover.jpg.512.jpg")
  // This IS the correct MangaDex thumbnail format per their API docs.
  const directUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverFilename}.512.jpg`;
  return proxyImageUrl(directUrl);
}

function mapManga(manga: any) {
  const attrs = manga.attributes;
  const coverRel = manga.relationships?.find((r: any) => r.type === "cover_art");
  const coverFilename = coverRel?.attributes?.fileName ?? null;
  const authorRel = manga.relationships?.find((r: any) => r.type === "author");

  const title =
    attrs.title?.en ||
    (Object.values(attrs.title ?? {}) as string[])[0] ||
    "Unknown";

  const description =
    attrs.description?.en ||
    (Object.values(attrs.description ?? {}) as string[])[0] ||
    null;

  const lang = attrs.originalLanguage ?? "";
  const type =
    lang === "ko"
      ? "Manhwa"
      : lang === "zh" || lang === "zh-hk"
      ? "Manhua"
      : "Manga";

  return {
    id: manga.id,
    title,
    description,
    image: coverFilename ? getCoverUrl(manga.id, coverFilename) : null,
    status: attrs.status ?? null,
    year: attrs.year ?? null,
    contentRating: attrs.contentRating ?? null,
    originalLanguage: lang,
    genres: (attrs.tags ?? [])
      .filter((t: any) => t.attributes?.group === "genre")
      .map((t: any) => t.attributes?.name?.en ?? (Object.values(t.attributes?.name ?? {}) as string[])[0]),
    themes: (attrs.tags ?? [])
      .filter((t: any) => t.attributes?.group === "theme")
      .map((t: any) => t.attributes?.name?.en ?? (Object.values(t.attributes?.name ?? {}) as string[])[0]),
    lastChapter: attrs.lastChapter ?? null,
    type,
    author: authorRel?.attributes?.name ?? null,
  };
}

async function mdFetch(path: string) {
  const res = await fetch(`${MANGADEX_BASE}${path}`, {
    headers: {
      "User-Agent": "ZaixAnime/1.0",
      "Referer": "https://mangadex.org/",
    },
  });
  if (!res.ok) throw new Error(`MangaDex API error: ${res.status} ${path}`);
  return res.json();
}

// ─── Image Proxy ────────────────────────────────────────────────────────────
// GET /api/proxy/image?url=...
// Proxies MangaDex CDN images, adding the required Referer header that
// browsers cannot set on <img> tags (otherwise CDN returns 403/404).
router.get("/proxy/image", async (req: Request, res: Response) => {
  const rawUrl = String(req.query.url || "").trim();

  if (!rawUrl) {
    res.status(400).json({ error: "url parameter is required" });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  const isAllowed = ALLOWED_IMAGE_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );
  if (!isAllowed) {
    res.status(403).json({ error: "Host not allowed" });
    return;
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: {
        "Referer": "https://mangadex.org/",
        "Origin": "https://mangadex.org",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-site",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await upstream.arrayBuffer());

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
    res.set("Content-Length", String(buffer.length));
    res.send(buffer);
  } catch (err: any) {
    req.log.error({ err, url: rawUrl }, "Image proxy error");
    res.status(502).end();
  }
});

// ─── Manga Trending ─────────────────────────────────────────────────────────
// GET /api/manga/trending?type=manga|manhwa|manhua
router.get("/manga/trending", async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || "manga");
    const limit = Math.min(20, parseInt(String(req.query.limit || "16")));
    const langMap: Record<string, string> = { manga: "ja", manhwa: "ko", manhua: "zh" };
    const lang = langMap[type] ?? "ja";

    const data = await mdFetch(
      `/manga?limit=${limit}&order[followedCount]=desc&includes[]=cover_art&contentRating[]=safe&originalLanguage[]=${lang}`
    );

    res.json({ data: (data.data ?? []).map(mapManga) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch trending manga");
    res.status(500).json({ error: "Failed to fetch trending manga from MangaDex" });
  }
});

// ─── Manga Search ────────────────────────────────────────────────────────────
// GET /api/manga/search?q=...&type=manga|manhwa|manhua
router.get("/manga/search", async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }
    const type = String(req.query.type || "");
    const limit = Math.min(20, parseInt(String(req.query.limit || "12")));
    const langMap: Record<string, string> = { manga: "ja", manhwa: "ko", manhua: "zh" };
    const langParam = langMap[type] ? `&originalLanguage[]=${langMap[type]}` : "";

    const data = await mdFetch(
      `/manga?title=${encodeURIComponent(q)}&limit=${limit}&includes[]=cover_art&contentRating[]=safe${langParam}`
    );

    res.json({ data: (data.data ?? []).map(mapManga) });
  } catch (err: any) {
    req.log.error({ err }, "Failed to search manga");
    res.status(500).json({ error: "Failed to search manga from MangaDex" });
  }
});

// ─── Chapter Pages ───────────────────────────────────────────────────────────
// GET /api/manga/chapter/:chapterId/pages?dataSaver=true|false
// MUST be registered before /:id to avoid param collision
router.get("/manga/chapter/:chapterId/pages", async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params;
    const dataSaver = req.query.dataSaver === "true";

    const data = await mdFetch(`/at-home/server/${chapterId}`);
    if (!data.chapter) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }

    const { baseUrl } = data;
    const { hash } = data.chapter;
    const files: string[] = dataSaver ? data.chapter.dataSaver : data.chapter.data;
    const quality = dataSaver ? "data-saver" : "data";

    res.json({
      chapterId,
      pages: files.map((filename, i) => ({
        index: i,
        // Proxy every page through our server so the at-home CDN gets
        // the required Referer header (browsers cannot set it on <img>)
        url: proxyImageUrl(`${baseUrl}/${quality}/${hash}/${filename}`),
        filename,
      })),
      total: files.length,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch chapter pages");
    res.status(500).json({ error: "Failed to fetch chapter pages from MangaDex" });
  }
});

// ─── Chapter List ────────────────────────────────────────────────────────────
// GET /api/manga/:id/chapters
router.get("/manga/:id/chapters", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(500, parseInt(String(req.query.limit || "500")));
    const offset = parseInt(String(req.query.offset || "0"));

    const data = await mdFetch(
      `/manga/${id}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}`
    );

    res.json({
      data: (data.data ?? []).map((ch: any) => ({
        id: ch.id,
        chapter: ch.attributes?.chapter ?? null,
        title: ch.attributes?.title ?? null,
        pages: ch.attributes?.pages ?? 0,
        publishAt: ch.attributes?.publishAt ?? null,
        volume: ch.attributes?.volume ?? null,
      })),
      total: data.total ?? 0,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch chapters");
    res.status(500).json({ error: "Failed to fetch chapters from MangaDex" });
  }
});

// ─── Manga Detail ────────────────────────────────────────────────────────────
// GET /api/manga/:id — MUST come AFTER all static sub-routes
router.get("/manga/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = await mdFetch(
      `/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`
    );
    if (!data.data) {
      res.status(404).json({ error: "Manga not found" });
      return;
    }
    res.json(mapManga(data.data));
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch manga detail");
    res.status(500).json({ error: "Failed to fetch manga detail from MangaDex" });
  }
});

export default router;
