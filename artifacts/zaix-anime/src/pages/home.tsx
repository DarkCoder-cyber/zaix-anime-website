import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { MangaCard } from "@/components/manga-card";
import { useGetTrendingAnime, useGetRecentAnime, getGetTrendingAnimeQueryKey, getGetRecentAnimeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import heroBg from "@/assets/hero-bg.png";
import { Search, History, Sparkles, BookOpen, Users, Heart, Play, ExternalLink, ChevronDown } from "lucide-react";
import { useRecentlyVisited } from "@/hooks/use-local-store";
import { cachedFetchJson } from "@/hooks/api-cache";
import { useAuth } from "@/hooks/use-auth";

function useLiveUsers() {
  const base = useRef(Math.floor(Math.random() * 600) + 1200);
  const [count, setCount] = useState(base.current);
  useEffect(() => {
    const id = setInterval(() => {
      setCount(prev => {
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.max(900, Math.min(2400, prev + delta));
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  return count;
}

async function fetchMangaTrending(type: string) {
  return cachedFetchJson(`manga-trending:${type}`, async () => {
    const res = await fetch(`/api/manga/trending?type=${type}&limit=16`);
    if (!res.ok) throw new Error(`MangaDex returned ${res.status}`);
    return res.json();
  });
}

async function fetchDonghua() {
  return cachedFetchJson("donghua", async () => {
    const res = await fetch(`/api/anime/search?q=donghua&limit=16`);
    if (!res.ok) throw new Error(`Jikan returned ${res.status}`);
    return res.json();
  });
}

const TAB_CONFIG: { key: ContentTab; label: string; emoji: string }[] = [
  { key: "anime", label: "Anime", emoji: "🎌" },
  { key: "manga", label: "Manga", emoji: "📚" },
  { key: "manhwa", label: "Manhwa", emoji: "🇰🇷" },
  { key: "donghua", label: "Donghua", emoji: "🐉" },
];

type ContentTab = "anime" | "manga" | "manhwa" | "donghua";

function ContinueWatchingCard({ item }: { item: any }) {
  const href = item.contentType === "anime" || item.type === "anime"
    ? `/watch/${item.contentId || item.id}`
    : `/manga/${item.contentId || item.id}`;
  const title = item.contentTitle || item.title;
  const image = item.contentImage || item.image;
  const episode = item.episode;
  return (
    <Link href={href}>
      <div className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border hover:border-primary hover:shadow-neon transition-all duration-300 cursor-pointer">
        {image ? (
          <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary animate-pulse" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/40">
            <Play className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-bold text-white line-clamp-1 text-shadow-neon">{title}</p>
          {episode && <p className="text-xs text-primary mt-0.5">Ep {episode}</p>}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ContentTab>("anime");
  const [, setLocation] = useLocation();
  const { recent } = useRecentlyVisited();
  const { user } = useAuth();
  const liveUsers = useLiveUsers();
  const [heroScroll, setHeroScroll] = useState(0);
  const heroBgRef = useRef<HTMLImageElement>(null);
  const [heroQuery, setHeroQuery] = useState("");
  const [heroResults, setHeroResults] = useState<any[]>([]);
  const [heroSearching, setHeroSearching] = useState(false);
  const [heroFocused, setHeroFocused] = useState(false);
  const heroSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setHeroScroll(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (heroSearchRef.current && !heroSearchRef.current.contains(e.target as Node)) {
        setHeroFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!heroQuery.trim() || heroQuery.length < 2) { setHeroResults([]); return; }
    const t = setTimeout(async () => {
      setHeroSearching(true);
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(heroQuery.trim())}&limit=6`);
        if (res.ok) { const d = await res.json(); setHeroResults(d.data ?? []); }
      } catch {} finally { setHeroSearching(false); }
    }, 280);
    return () => clearTimeout(t);
  }, [heroQuery]);

  const recGenre = useMemo(() => {
    const genres = ["Action", "Fantasy", "Romance", "Sci-Fi", "Mystery", "Supernatural", "Comedy", "Thriller", "Isekai"];
    return genres[Math.floor(Math.random() * genres.length)];
  }, []);

  const { data: trendingData, isLoading: trendingLoading } = useGetTrendingAnime({ limit: 12 }, { query: { queryKey: getGetTrendingAnimeQueryKey({ limit: 12 }) } });
  const { data: recentData, isLoading: recentLoading } = useGetRecentAnime({ limit: 8 }, { query: { queryKey: getGetRecentAnimeQueryKey({ limit: 8 }) } });
  const { data: mangaData, isLoading: mangaLoading, error: mangaError } = useQuery({ queryKey: ["manga-trending", "manga"], queryFn: () => fetchMangaTrending("manga"), enabled: activeTab === "manga", retry: 1 });
  const { data: manhwaData, isLoading: manhwaLoading, error: manhwaError } = useQuery({ queryKey: ["manga-trending", "manhwa"], queryFn: () => fetchMangaTrending("manhwa"), enabled: activeTab === "manhwa", retry: 1 });
  const { data: donghuaData, isLoading: donghuaLoading, error: donghuaError } = useQuery({ queryKey: ["donghua"], queryFn: fetchDonghua, enabled: activeTab === "donghua", retry: 1 });

  // DB-backed Continue Watching for logged-in users
  const { data: watchlistData } = useQuery({
    queryKey: ["watchlist-home", user?.id],
    queryFn: async () => {
      const token = localStorage.getItem("zaix_token");
      if (!token) return { items: [] };
      const res = await fetch("/api/watchlist", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { items: [] };
      return res.json();
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Dynamic recommendations
  const trendingIds = (trendingData?.data ?? []).map((a: any) => a.malId).join(",");
  const { data: recommendationsData } = useQuery({
    queryKey: ["recommendations", recGenre],
    queryFn: async () => {
      const res = await fetch(`/api/recommendations?genres=${recGenre}&exclude=${trendingIds}&limit=12`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const trendingAnime = trendingData?.data ?? [];
  const recentAnime = recentData?.data ?? [];
  const mangaList = mangaData?.data ?? [];
  const manhwaList = manhwaData?.data ?? [];
  const donghuaList = donghuaData?.data ?? [];
  const recommendedAnime = recommendationsData?.data ?? [];
  const recommendedGenre = recommendationsData?.genre ?? recGenre;

  const dbWatchingItems = (watchlistData?.items ?? []).filter((i: any) => i.status === "watching" && i.contentType === "anime");
  const continueWatching = user
    ? dbWatchingItems.slice(0, 6)
    : recent.filter(r => r.type === "anime").slice(0, 6);

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero — full-screen with parallax */}
      <section className="relative w-full flex items-center justify-center overflow-hidden" style={{ height: "100svh", minHeight: 600 }}>
        {/* Parallax background */}
        <div
          className="absolute inset-0 z-0 will-change-transform"
          style={{ transform: `translateY(${heroScroll * 0.35}px)`, top: "-15%", bottom: "-15%", left: 0, right: 0 }}
        >
          <img
            ref={heroBgRef}
            src={heroBg}
            alt="Hero"
            className="w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {/* Layered gradient overlays */}
        <div className="absolute inset-0 z-[1]" style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.65) 65%, rgba(0,0,0,0.97) 100%)"
        }} />
        {/* Subtle side vignette so edges feel cinematic */}
        <div className="absolute inset-0 z-[2]" style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)"
        }} />

        {/* Hero content */}
        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center gap-0">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black font-heading text-white tracking-tight mb-4 text-shadow-neon leading-none">
            ZAIX <span className="text-primary">ANIME</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-foreground/85 font-medium mb-6 max-w-xl text-shadow-neon">
            Stream Anime. Read Manga. Discover Manhwa.
          </p>

          {/* Hero Search */}
          <div ref={heroSearchRef} className="relative w-full max-w-lg mb-6">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border bg-black/60 backdrop-blur-xl transition-all duration-200 ${heroFocused ? "border-primary/70 shadow-neon" : "border-white/15 hover:border-white/30"}`}>
              {heroSearching
                ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                : <Search className="w-4 h-4 text-primary/70 shrink-0" />
              }
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                onFocus={() => setHeroFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && heroResults.length > 0) {
                    setLocation(`/watch/${heroResults[0].malId}`);
                    setHeroQuery(""); setHeroResults([]); setHeroFocused(false);
                  }
                  if (e.key === "Escape") { setHeroFocused(false); setHeroQuery(""); setHeroResults([]); }
                }}
                placeholder="Search any anime... Naruto, One Piece, AOT"
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/35 focus:outline-none"
                autoComplete="off"
              />
              {heroQuery && (
                <button onClick={() => { setHeroQuery(""); setHeroResults([]); }}
                  className="shrink-0 text-white/30 hover:text-white/70 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Autocomplete dropdown */}
            {heroFocused && heroResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-primary/20 rounded-2xl overflow-hidden shadow-neon-intense z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {heroResults.map((anime, i) => (
                  <button
                    key={anime.malId}
                    onMouseDown={() => {
                      setLocation(`/watch/${anime.malId}`);
                      setHeroQuery(""); setHeroResults([]); setHeroFocused(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary/10 transition-colors ${i !== heroResults.length - 1 ? "border-b border-white/5" : ""}`}
                  >
                    {anime.image
                      ? <img src={anime.image} alt={anime.title} className="w-9 h-12 object-cover rounded-lg shrink-0" />
                      : <div className="w-9 h-12 rounded-lg bg-secondary shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{anime.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {anime.type && <span className="text-[10px] text-primary/70 font-medium">{anime.type}</span>}
                        {anime.score && <span className="text-[10px] text-yellow-400/70">★ {anime.score}</span>}
                        {anime.episodes && <span className="text-[10px] text-white/30">{anime.episodes} eps</span>}
                      </div>
                    </div>
                    <Play className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                  </button>
                ))}
                <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/25">Press Enter to open first result</span>
                  <span className="text-[10px] text-primary/40">{heroResults.length} results</span>
                </div>
              </div>
            )}

            {/* No results state */}
            {heroFocused && heroQuery.length >= 2 && !heroSearching && heroResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 text-center z-50">
                <p className="text-sm text-white/40">No results for <span className="text-white/60">"{heroQuery}"</span></p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full max-w-sm sm:max-w-md">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 shadow-neon font-bold text-base h-13 px-8"
              onClick={() => setActiveTab("anime")}
            >
              Browse Anime
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-primary/50 text-white hover:bg-primary/10 hover:text-primary backdrop-blur-sm h-13 px-8"
              onClick={() => setActiveTab("manga")}
            >
              Read Manga
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-black/50 backdrop-blur-md shadow-neon">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ boxShadow: "0 0 6px #39ff14" }} />
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-bold text-white">{liveUsers.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground font-medium">watching right now</span>
          </div>
        </div>

        {/* Scroll-down arrow — fades out once user scrolls */}
        <div
          className="absolute bottom-10 left-0 right-0 z-[4] flex flex-col items-center gap-1 pointer-events-none transition-opacity duration-500"
          style={{ opacity: heroScroll > 60 ? 0 : 1 }}
        >
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Scroll</span>
          <div className="flex flex-col items-center" style={{ animation: "hero-bounce 1.6s ease-in-out infinite" }}>
            <ChevronDown className="w-5 h-5 text-primary/70" />
            <ChevronDown className="w-5 h-5 text-primary/40 -mt-3" />
          </div>
        </div>

        {/* Bottom fade into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-32 z-[3]" style={{
          background: "linear-gradient(to bottom, transparent, hsl(var(--background)))"
        }} />
      </section>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section className="py-14 container mx-auto px-4">
          <SectionHeader
            icon={<History className="w-5 h-5 text-primary" />}
            title="Continue Watching"
            subtitle={user ? "From your watchlist" : "Pick up where you left off"}
          />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {continueWatching.map((item: any) => (
              <ContinueWatchingCard key={item.id || item.contentId} item={item} />
            ))}
          </div>
          {user && (
            <div className="mt-4 flex justify-end">
              <Link href={`/profile/${user.username}`}>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View full watchlist
                </button>
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Content Tabs */}
      <section className="py-8 container mx-auto px-4">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-5 py-2.5 rounded-full font-bold text-sm border transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-primary text-black border-primary shadow-neon"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "anime" && (
          <div className="flex flex-col gap-14">
            {/* Trending */}
            <div>
              <SectionHeader icon={<Search className="w-5 h-5 text-primary" />} title="Trending Anime" subtitle="Top picks this season" />
              {trendingLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {trendingAnime.map((anime: any) => <AnimeCard key={anime.malId} anime={anime} layout="trending" />)}
                </div>
              )}
            </div>

            {/* Recommendations */}
            {recommendedAnime.length > 0 && (
              <div>
                <SectionHeader
                  icon={<Sparkles className="w-5 h-5 text-primary" />}
                  title="Recommended for You"
                  subtitle={`Top ${recommendedGenre} picks you might love`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {recommendedAnime.map((anime: any) => <AnimeCard key={anime.malId} anime={anime} layout="trending" />)}
                </div>
              </div>
            )}

            {/* Recent */}
            <div>
              <SectionHeader icon={<BookOpen className="w-5 h-5 text-primary" />} title="Recently Added" subtitle="Fresh off the press" />
              {recentLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {recentAnime.map((anime: any) => <AnimeCard key={anime.malId} anime={anime} layout="new" />)}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "manga" && (
          <div>
            <SectionHeader icon={<BookOpen className="w-5 h-5 text-primary" />} title="Trending Manga" subtitle="Top manga right now" />
            {mangaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}</div>
            ) : mangaError ? (
              <MangaError message="Manga service is temporarily unavailable. Please try again later." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mangaList.map((m: any) => <MangaCard key={m.malId || m.id} manga={m} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === "manhwa" && (
          <div>
            <SectionHeader icon={<BookOpen className="w-5 h-5 text-primary" />} title="Popular Manhwa" subtitle="Korean comics trending now" />
            {manhwaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}</div>
            ) : manhwaError ? (
              <MangaError message="Manhwa service is temporarily unavailable. Please try again later." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {manhwaList.map((m: any) => <MangaCard key={m.malId || m.id} manga={m} />)}
              </div>
            )}
          </div>
        )}

        {activeTab === "donghua" && (
          <div>
            <SectionHeader icon={<BookOpen className="w-5 h-5 text-primary" />} title="Trending Donghua" subtitle="Chinese animation picks" />
            {donghuaLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">{[...Array(12)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-xl" />)}</div>
            ) : donghuaError ? (
              <MangaError message="Donghua service is temporarily unavailable. Please try again later." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {donghuaList.map((a: any) => <AnimeCard key={a.malId} anime={a} layout="trending" />)}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 mb-8">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-2xl sm:text-3xl font-bold font-heading text-white">{title}</h2>
        <div className="h-px bg-primary/50 flex-1 shadow-neon mt-1" />
      </div>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}

function MangaError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><span className="text-3xl">⚠️</span></div>
      <p className="text-white font-bold">Service Unavailable</p>
      <p className="text-muted-foreground text-sm max-w-md">{message}</p>
      <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}
