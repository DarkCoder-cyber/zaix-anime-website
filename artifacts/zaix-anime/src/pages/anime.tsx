import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Star, Play, ChevronRight, ChevronLeft,
  Info, Search, X, Loader2, Tv, AlertTriangle, RefreshCw, Wifi
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

interface AnimeItem {
  malId: number;
  title: string;
  image: string | null;
  backdropUrl?: string | null;
  score: number | null;
  episodes: number | null;
  status: string | null;
  genres: string[];
  synopsis: string | null;
  year: number | null;
  type: string | null;
}

const GENRE_FILTERS = [
  { key: "All", label: "All Anime" },
  { key: "Action", label: "Action" },
  { key: "Romance", label: "Romance" },
  { key: "Comedy", label: "Comedy" },
  { key: "Fantasy", label: "Fantasy" },
  { key: "Isekai", label: "Isekai" },
  { key: "Sci-Fi", label: "Sci-Fi" },
  { key: "Drama", label: "Drama" },
  { key: "Supernatural", label: "Supernatural" },
  { key: "Shounen", label: "Shounen" },
];

const HERO_INTERVAL = 6000;
const DEFAULT_BG = "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1920&q=80";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AnimeCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="aspect-[2/3] shimmer-bg rounded-t-2xl" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 w-3/4 rounded shimmer-bg" />
        <div className="h-3 w-1/2 rounded shimmer-bg" />
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: 500, maxHeight: 760, background: "rgba(255,255,255,0.02)" }}>
      <div className="absolute inset-0 shimmer-bg" />
      <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex flex-col gap-4">
        <div className="h-5 w-24 rounded-full shimmer-bg" />
        <div className="h-12 w-2/3 rounded-xl shimmer-bg" />
        <div className="h-4 w-full max-w-lg rounded shimmer-bg" />
        <div className="flex gap-3 mt-2">
          <div className="h-12 w-36 rounded-xl shimmer-bg" />
          <div className="h-12 w-28 rounded-xl shimmer-bg" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center px-4">
      <div className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <p className="text-white/70 font-semibold text-base mb-1">{message}</p>
        <p className="text-white/30 text-sm">The anime API may be temporarily unavailable.</p>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
}

function AnimeCard({ anime }: { anime: AnimeItem }) {
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-[1.04] hover:z-10"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      onClick={() => setLocation(`/watch/${anime.malId}`)}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-black">
        {!imgLoaded && <div className="absolute inset-0 shimmer-bg" />}
        {anime.image ? (
          <img src={anime.image} alt={anime.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
            <Tv className="w-12 h-12 text-purple-400/40" />
          </div>
        )}

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: "rgba(168,85,247,0.9)", boxShadow: "0 0 30px rgba(168,85,247,0.6)" }}>
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {anime.type && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-black"
              style={{ background: "rgba(57,255,20,0.85)", color: "#000" }}>{anime.type}</span>
          )}
          {anime.year && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.5)" }}>{anime.year}</span>
          )}
        </div>

        {anime.score && anime.score > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400">{anime.score.toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="p-3" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>
        <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">{anime.title}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {anime.genres.slice(0, 2).map((g) => (
            <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
              {g}
            </span>
          ))}
          {anime.episodes && (
            <span className="text-[10px] text-white/35">{anime.episodes} eps</span>
          )}
        </div>
      </div>
    </div>
  );
}

function AnimeHero({ items }: { items: AnimeItem[] }) {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backdropA, setBackdropA] = useState("");
  const [backdropB, setBackdropB] = useState("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [contentVisible, setContentVisible] = useState(true);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getBackdrop = useCallback((item: AnimeItem) => {
    return item.backdropUrl || item.image || DEFAULT_BG;
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const url = getBackdrop(items[0]);
    setBackdropA(url); setBackdropB(url);
  }, [items, getBackdrop]);

  const goTo = useCallback((newIdx: number) => {
    if (transitioning || newIdx === idx) return;
    const url = getBackdrop(items[newIdx]);
    setTransitioning(true);
    setContentVisible(false);
    if (activeLayer === "A") { setBackdropB(url); setTimeout(() => setActiveLayer("B"), 30); }
    else { setBackdropA(url); setTimeout(() => setActiveLayer("A"), 30); }
    setTimeout(() => { setIdx(newIdx); setContentVisible(true); setTransitioning(false); }, 500);
  }, [transitioning, idx, activeLayer, items, getBackdrop]);

  const next = useCallback(() => goTo((idx + 1) % items.length), [goTo, idx, items.length]);
  const prev = useCallback(() => goTo((idx - 1 + items.length) % items.length), [goTo, idx, items.length]);

  useEffect(() => {
    if (items.length < 2 || paused) { setProgress(0); return; }
    setProgress(0);
    const tickMs = 50; const steps = HERO_INTERVAL / tickMs; let tick = 0;
    progressRef.current = setInterval(() => {
      tick++; setProgress(tick / steps);
      if (tick >= steps) clearInterval(progressRef.current!);
    }, tickMs);
    autoRef.current = setTimeout(next, HERO_INTERVAL);
    return () => { clearInterval(progressRef.current!); clearTimeout(autoRef.current!); };
  }, [idx, paused, items.length, next]);

  const featured = items[idx];
  if (!featured) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: 500, maxHeight: 760 }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropA})`, opacity: activeLayer === "A" ? 1 : 0, filter: "blur(2px) saturate(1.2)", transform: "scale(1.05)" }} />
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropB})`, opacity: activeLayer === "B" ? 1 : 0, filter: "blur(2px) saturate(1.2)", transform: "scale(1.05)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.1) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 30%, transparent 65%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%)" }} />
      </div>

      <div className="absolute inset-0 flex items-end pb-14 px-6 sm:px-10 lg:px-16"
        style={{ transition: "opacity 0.4s ease", opacity: contentVisible ? 1 : 0 }}>
        <div className="flex items-end justify-between w-full max-w-7xl mx-auto gap-6">
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{ background: "rgba(57,255,20,0.15)", border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14" }}>
                <Tv className="w-3 h-3" /> Featured Anime
              </span>
              {featured.score && featured.score > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#fbbf24" }}>
                  <Star className="w-3 h-3 fill-yellow-400" /> {featured.score.toFixed(1)}
                </span>
              )}
              {featured.type && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black"
                  style={{ background: "rgba(57,255,20,0.85)", color: "#000" }}>{featured.type}</span>
              )}
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight"
              style={{ textShadow: "0 2px 40px rgba(0,0,0,0.8)" }}>{featured.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {featured.genres.slice(0, 3).map((g) => (
                <span key={g} className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                  {g}
                </span>
              ))}
              {featured.episodes && (
                <span className="text-xs text-white/40">{featured.episodes} episodes</span>
              )}
              {featured.year && <span className="text-xs text-white/30">{featured.year}</span>}
            </div>
            {featured.synopsis && (
              <p className="text-sm sm:text-base text-white/60 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-md">
                {featured.synopsis}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setLocation(`/watch/${featured.malId}`)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-black text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 30px rgba(168,85,247,0.5)" }}>
                <Play className="w-4 h-4 fill-white" /> Watch Now
              </button>
              <button onClick={() => setLocation(`/watch/${featured.malId}`)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}>
                <Info className="w-4 h-4" /> More Info
              </button>
            </div>
          </div>
          {featured.image && (
            <div className="hidden lg:block shrink-0">
              <img src={featured.image} alt={featured.title} className="w-40 xl:w-48 rounded-2xl shadow-2xl"
                style={{ border: "2px solid rgba(168,85,247,0.4)", boxShadow: "0 0 60px rgba(168,85,247,0.25), 0 25px 60px rgba(0,0,0,0.8)", opacity: contentVisible ? 1 : 0, transition: "opacity 0.4s ease" }} />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-6 sm:left-10 lg:left-16 flex items-center gap-3">
        {items.length > 1 && items.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: i === idx ? "48px" : "8px", background: "rgba(255,255,255,0.2)" }}>
            {i === idx && (
              <div className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, #a855f7, #c084fc)", transition: paused ? "none" : "width 0.05s linear", boxShadow: "0 0 8px rgba(168,85,247,0.6)" }} />
            )}
          </button>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={next} className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}

export default function AnimePage() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 300);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [bgUrl, setBgUrl] = useState(DEFAULT_BG);

  const { data: trendingData, isLoading: trendingLoading, isError: trendingError, refetch: refetchTrending } = useQuery<{ data: AnimeItem[] }>({
    queryKey: ["anime-trending"],
    queryFn: async () => {
      const res = await fetch("/api/anime/trending?limit=16");
      if (!res.ok) throw new Error("Failed to fetch trending anime");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const buildBrowseUrl = (page: number) => {
    if (searchQuery.trim()) {
      return `/api/anime/search?q=${encodeURIComponent(searchQuery.trim())}&page=${page}`;
    }
    if (activeGenre !== "All") {
      return `/api/anime/search?q=${encodeURIComponent(activeGenre)}&page=${page}&orderBy=score`;
    }
    return `/api/anime/trending?limit=20&page=${page}`;
  };

  const {
    data: browseData,
    isLoading: browseLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<{ data: AnimeItem[]; pagination: { hasNextPage: boolean } }>({
    queryKey: ["anime-browse", activeGenre, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const url = buildBrowseUrl(pageParam as number);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch anime");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const hasNext = lastPage.pagination?.hasNextPage ?? false;
      const nextPage = allPages.length + 1;
      return hasNext && nextPage <= 15 ? nextPage : undefined;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const heroItems = (trendingData?.data ?? []).filter((a) => a.image).slice(0, 8);
  const allAnime = browseData?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    if (heroItems.length > 0) setBgUrl(heroItems[0].image || DEFAULT_BG);
  }, [heroItems.length]);

  // IntersectionObserver for true infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, { rootMargin: "300px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keyboard shortcut
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && document.activeElement === searchRef.current) { setSearchInput(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  return (
    <ErrorBoundary>
      <style>{`
        @keyframes shimmer-move {
          0%   { background-position: -400px 0; }
          100% { background-position: calc(400px + 100%) 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.08) 80px, rgba(255,255,255,0.03) 160px);
          background-size: 400px 100%;
          animation: shimmer-move 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Cinematic background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgUrl})`, transition: "opacity 0.5s ease", filter: "blur(3px) saturate(0.7)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.96) 100%)" }} />
      </div>

      <div className="relative z-10 min-h-screen pb-24">
        {/* HERO */}
        <div className="pt-16">
          {trendingLoading ? (
            <HeroSkeleton />
          ) : trendingError ? (
            <div className="pt-20 pb-10 text-center px-4">
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
                style={{ textShadow: "0 0 60px rgba(168,85,247,0.35)" }}>
                ZAIX <span style={{ color: "#a855f7" }}>ANIME</span>
              </h1>
              <p className="text-white/40 text-base max-w-sm mx-auto mb-6">Couldn't load trending anime right now.</p>
              <button onClick={() => refetchTrending()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white mx-auto transition-all hover:scale-105"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : heroItems.length > 0 ? (
            <AnimeHero items={heroItems} />
          ) : (
            <div className="pt-20 pb-10 text-center px-4">
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
                style={{ textShadow: "0 0 60px rgba(168,85,247,0.35)" }}>
                ZAIX <span style={{ color: "#a855f7" }}>ANIME</span>
              </h1>
              <p className="text-white/50 text-lg max-w-md mx-auto">1000+ anime titles. Dub &amp; Sub available.</p>
            </div>
          )}
        </div>

        {/* BROWSE */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
              Browse Anime
            </h2>
            <span className="text-xs text-white/30">
              {allAnime.length > 0 ? `${allAnime.length}+ loaded` : ""}
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300"
              style={{
                background: searchFocused ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
                border: searchFocused ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}>
              <Search className="w-4 h-4 shrink-0"
                style={{ color: searchFocused ? "#a855f7" : "rgba(255,255,255,0.3)" }} />
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder='Search anime… (press "/" to focus)'
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              {!searchFocused && !searchInput && (
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white/20 border border-white/10">/</kbd>
              )}
            </div>
          </div>

          {/* Genre tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {GENRE_FILTERS.map((g) => (
              <button key={g.key}
                onClick={() => { setActiveGenre(g.key); setSearchInput(""); }}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={activeGenre === g.key
                  ? { background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {g.label}
              </button>
            ))}
          </div>

          {/* Grid — never shows a hard error; always shows skeleton or data */}
          {browseLoading && allAnime.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 18 }).map((_, i) => <AnimeCardSkeleton key={i} />)}
            </div>
          ) : allAnime.length === 0 ? (
            <div className="text-center py-20">
              <Tv className="w-12 h-12 text-purple-400/20 mx-auto mb-4" />
              <p className="text-white/30 text-lg font-semibold">No anime found</p>
              <p className="text-white/20 text-sm mt-1">Try a different search or genre</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {allAnime.map((anime, i) => (
                <AnimeCard key={`${anime.malId}-${i}`} anime={anime} />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center mt-10 h-10">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading more anime…
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
