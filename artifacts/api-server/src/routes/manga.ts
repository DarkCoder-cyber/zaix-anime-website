import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const MANGADEX_BASE = "https://api.mangadex.org";

function getCoverUrl(mangaId: string, coverFilename: string): string {
  return `https://uploads.mangadex.org/covers/${mangaId}/${coverFilename}.512.jpg`;
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
    headers: { "User-Agent": "ZaixAnime/1.0" },
  });
  if (!res.ok) throw new Error(`MangaDex API error: ${res.status} ${path}`);
  return res.json();
}

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

// GET /api/manga/chapter/:chapterId/pages — MUST come before /:id
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
      baseUrl,
      hash,
      pages: files.map((filename, i) => ({
        index: i,
        url: `${baseUrl}/${quality}/${hash}/${filename}`,
        filename,
      })),
      total: files.length,
    });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch chapter pages");
    res.status(500).json({ error: "Failed to fetch chapter pages from MangaDex" });
  }
});

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

// GET /api/manga/:id — detail (must come AFTER static sub-routes)
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
