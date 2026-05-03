import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const JIKAN_BASE = "https://api.jikan.moe/v4";

const GENRE_MAP: Record<string, number> = {
  Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Fantasy: 10,
  Horror: 14, Mystery: 7, Romance: 22, "Sci-Fi": 24, "Slice of Life": 36,
  Sports: 30, Supernatural: 37, Thriller: 41, Mecha: 18, School: 23,
  Isekai: 62, Military: 38, Harem: 35, Shounen: 27, Seinen: 42,
};

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

// GET /api/recommendations?genres=Action,Fantasy&exclude=21,1735&limit=12
router.get("/recommendations", async (req: Request, res: Response) => {
  try {
    const genreParam = String(req.query.genres || "Action");
    const excludeParam = String(req.query.exclude || "");
    const limit = Math.min(20, parseInt(String(req.query.limit || "12")));

    const requestedGenres = genreParam.split(",").map(g => g.trim()).filter(Boolean);
    const excludeIds = new Set(excludeParam.split(",").filter(Boolean));

    // Pick genre with best coverage, shuffle among top genres
    const availableGenres = requestedGenres.filter(g => GENRE_MAP[g]);
    const genre = availableGenres.length > 0
      ? availableGenres[Math.floor(Math.random() * Math.min(availableGenres.length, 3))]
      : "Action";
    const genreId = GENRE_MAP[genre] ?? 1;

    const res2 = await fetch(
      `${JIKAN_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=24&min_score=6`,
      { headers: { "User-Agent": "ZaixAnime/1.0" } }
    );
    if (!res2.ok) throw new Error(`Jikan ${res2.status}`);
    const data = await res2.json();

    const seen = new Set<number>();
    const filtered = (data.data ?? [])
      .map(mapAnimeCard)
      .filter((a: any) => {
        if (seen.has(a.malId) || excludeIds.has(String(a.malId))) return false;
        seen.add(a.malId);
        return true;
      })
      .slice(0, limit);

    res.json({ data: filtered, genre, total: filtered.length });
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch recommendations");
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
