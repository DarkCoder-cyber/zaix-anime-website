import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Star, Play, Film, ChevronRight, ChevronLeft,
  Info, Clapperboard, Volume2, Search, X, Loader2,
  AlertTriangle, Wifi
} from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

interface Movie {
  id: number;
  tmdbId?: number;
  title: string;
  poster: string | null;
  backdropUrl: string | null;
  streamUrl: string;
  genre: string;
  language: string;
  rating: string | null;
  description: string | null;
  year?: string | null;
  createdAt: string;
}

const GENRE_FILTERS = [
  { key: "All",          label: "All Films"     },
  { key: "Bollywood",    label: "Bollywood"     },
  { key: "South Indian", label: "South Indian"  },
  { key: "Hollywood",    label: "Hollywood"     },
];

const DEFAULT_BACKDROP =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80&auto=format&fit=crop";
const HERO_INTERVAL = 6000;

// 300 ms debounce — keeps search lightning-fast
function useDebounce<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function getMovieId(m: Movie) { return m.tmdbId ?? m.id; }

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
function CardSkeleton() {
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
    <div className="relative w-full overflow-hidden"
      style={{ height: "78vh", minHeight: 500, maxHeight: 760, background: "rgba(255,255,255,0.02)" }}>
      <div className="absolute inset-0 shimmer-bg" />
      <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex flex-col gap-4">
        <div className="h-5 w-28 rounded-full shimmer-bg" />
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

// Subtle inline warning shown when falling back to DB data
function FallbackBanner() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-xs font-medium"
      style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", color: "rgba(234,179,8,0.8)" }}>
      <Wifi className="w-3.5 h-3.5 shrink-0" />
      Showing saved films — TMDB is temporarily slow. Live data will reload automatically.
    </div>
  );
}

// ─── Movie card ───────────────────────────────────────────────────────────────
function MovieCard({ movie, onHover }: { movie: Movie; onHover: (url: string) => void }) {
  const [, setLocation] = useLocation();
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-[1.04] hover:z-10"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      onMouseEnter={() => onHover(movie.backdropUrl || DEFAULT_BACKDROP)}
      onClick={() => setLocation(`/movies/${getMovieId(movie)}`)}>

      <div className="aspect-[2/3] relative overflow-hidden bg-black">
        {!loaded && <div className="absolute inset-0 shimmer-bg" />}
        {movie.poster
          ? <img src={movie.poster} alt={movie.title}
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
              <Film className="w-12 h-12 text-purple-400/40" />
            </div>
        }

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
              style={{ background: "rgba(168,85,247,0.9)", boxShadow: "0 0 30px rgba(168,85,247,0.6)" }}>
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black"
            style={{ background: "rgba(255,165,0,0.9)", color: "#000" }}>HD</span>
          {movie.year && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.5)" }}>{movie.year}</span>}
        </div>

        {movie.rating && parseFloat(movie.rating) > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.75)" }}>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400">{movie.rating}</span>
          </div>
        )}
      </div>

      <div className="p-3" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(12px)" }}>
        <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">{movie.title}</h3>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
            {movie.genre}
          </span>
          <span className="text-[10px] text-white/40">{movie.language}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Hero carousel ────────────────────────────────────────────────────────────
function FeaturedHero({ movies, onMovieSelect }: { movies: Movie[]; onMovieSelect: (m: Movie) => void }) {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bdA, setBdA] = useState("");
  const [bdB, setBdB] = useState("");
  const [layer, setLayer] = useState<"A"|"B">("A");
  const [visible, setVisible] = useState(true);
  const intRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const tmrRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    if (!movies.length) return;
    const u = movies[0].backdropUrl || DEFAULT_BACKDROP;
    setBdA(u); setBdB(u);
  }, [movies]);

  const goTo = useCallback((ni: number) => {
    if (transitioning || ni === idx) return;
    const u = movies[ni].backdropUrl || DEFAULT_BACKDROP;
    setTransitioning(true); setVisible(false);
    if (layer === "A") { setBdB(u); setTimeout(() => setLayer("B"), 30); }
    else { setBdA(u); setTimeout(() => setLayer("A"), 30); }
    setTimeout(() => { setIdx(ni); setVisible(true); setTransitioning(false); }, 500);
    onMovieSelect(movies[ni]);
  }, [transitioning, idx, layer, movies, onMovieSelect]);

  const next = useCallback(() => goTo((idx + 1) % movies.length), [goTo, idx, movies.length]);
  const prev = useCallback(() => goTo((idx - 1 + movies.length) % movies.length), [goTo, idx, movies.length]);

  useEffect(() => {
    if (movies.length < 2 || paused) { setProgress(0); return; }
    setProgress(0);
    const tickMs = 50, steps = HERO_INTERVAL / tickMs; let tick = 0;
    intRef.current = setInterval(() => { tick++; setProgress(tick / steps); if (tick >= steps) clearInterval(intRef.current!); }, tickMs);
    tmrRef.current = setTimeout(next, HERO_INTERVAL);
    return () => { clearInterval(intRef.current!); clearTimeout(tmrRef.current!); };
  }, [idx, paused, movies.length, next]);

  const f = movies[idx];
  if (!f) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: 500, maxHeight: 760 }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0">
        {[{src:bdA,active:layer==="A"},{src:bdB,active:layer==="B"}].map(({src,active},i)=>(
          <div key={i} className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{ backgroundImage: `url(${src})`, opacity: active ? 1 : 0 }} />
        ))}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.4) 55%,rgba(0,0,0,0.1) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,1) 0%,rgba(0,0,0,0.5) 30%,transparent 65%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,transparent 20%)" }} />
      </div>

      <div className="absolute inset-0 flex items-end pb-14 px-6 sm:px-10 lg:px-16"
        style={{ transition: "opacity 0.4s ease", opacity: visible ? 1 : 0 }}>
        <div className="flex items-end justify-between w-full max-w-7xl mx-auto gap-6">
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{ background:"rgba(168,85,247,0.18)", border:"1px solid rgba(168,85,247,0.45)", color:"#c084fc" }}>
                <Clapperboard className="w-3 h-3" /> Featured Film
              </span>
              {f.rating && parseFloat(f.rating) > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background:"rgba(234,179,8,0.15)", border:"1px solid rgba(234,179,8,0.35)", color:"#fbbf24" }}>
                  <Star className="w-3 h-3 fill-yellow-400" /> {f.rating}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-black"
                style={{ background:"rgba(255,165,0,0.9)", color:"#000" }}>HD</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight"
              style={{ textShadow:"0 2px 40px rgba(0,0,0,0.8)" }}>{f.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background:"rgba(168,85,247,0.15)", color:"#c084fc", border:"1px solid rgba(168,85,247,0.3)" }}>
                {f.genre}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Volume2 className="w-3.5 h-3.5" /> {f.language}
              </span>
              {f.year && <span className="text-xs text-white/35">{f.year}</span>}
            </div>
            {f.description && (
              <p className="text-sm sm:text-base text-white/60 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-md">
                {f.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setLocation(`/movies/${getMovieId(f)}`)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-black text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background:"linear-gradient(135deg,#a855f7,#7c3aed)", boxShadow:"0 0 30px rgba(168,85,247,0.5)" }}>
                <Play className="w-4 h-4 fill-white" /> Watch Now
              </button>
              <button onClick={() => setLocation(`/movies/${getMovieId(f)}`)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(12px)" }}>
                <Info className="w-4 h-4" /> More Info
              </button>
            </div>
          </div>
          {f.poster && (
            <div className="hidden lg:block shrink-0">
              <img src={f.poster} alt={f.title} className="w-40 xl:w-48 rounded-2xl shadow-2xl"
                style={{ border:"2px solid rgba(168,85,247,0.4)", boxShadow:"0 0 60px rgba(168,85,247,0.25),0 25px 60px rgba(0,0,0,0.8)", opacity: visible ? 1 : 0, transition:"opacity 0.4s ease" }} />
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-4 left-6 sm:left-10 lg:left-16 flex items-center gap-3">
        {movies.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: i === idx ? 48 : 8, background: "rgba(255,255,255,0.2)" }}>
            {i === idx && (
              <div className="absolute inset-y-0 left-0 rounded-full"
                style={{ width:`${progress*100}%`, background:"linear-gradient(90deg,#a855f7,#c084fc)", transition: paused ? "none" : "width 0.05s linear", boxShadow:"0 0 8px rgba(168,85,247,0.6)" }} />
            )}
          </button>
        ))}
      </div>

      {movies.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200"
            style={{ background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(8px)" }}>
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={next} className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-200"
            style={{ background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.12)", backdropFilter:"blur(8px)" }}>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MoviesPage() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchInput, setSearchInput] = useState("");
  const searchQuery = useDebounce(searchInput, 300);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [bgUrl, setBgUrl] = useState(DEFAULT_BACKDROP);
  const [bgOpacity, setBgOpacity] = useState(1);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Trending (hero section) ────────────────────────────────────────────────
  const {
    data: trendingData,
    isLoading: trendingLoading,
    isError: trendingError,
  } = useQuery<{ movies: Movie[]; source?: string }>({
    queryKey: ["movies-trending"],
    queryFn: async () => {
      const res = await fetch("/api/movies/tmdb/trending");
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // ── Paginated browse ───────────────────────────────────────────────────────
  const endpoint =
    activeGenre === "South Indian" ? "/api/movies/tmdb/south"
    : activeGenre === "Hollywood"  ? "/api/movies/tmdb/search?genre=Hollywood"
    : "/api/movies/tmdb/bollywood";

  const searchEndpoint = searchQuery.trim()
    ? `/api/movies/tmdb/search?q=${encodeURIComponent(searchQuery.trim())}&genre=${encodeURIComponent(activeGenre)}`
    : null;

  const {
    data: browseData,
    isLoading: browseLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<{ movies: Movie[]; totalPages?: number; page?: number; source?: string }>({
    queryKey: ["movies-browse", activeGenre, searchQuery],
    queryFn: async ({ pageParam = 1 }) => {
      const base = searchEndpoint ?? endpoint;
      const sep = base.includes("?") ? "&" : "?";
      const url = `${base}${sep}page=${pageParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.totalPages ?? 1;
      const next = allPages.length + 1;
      return next <= Math.min(total, 25) ? next : undefined;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,   // show stale data while refetching — never blank
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const heroMovies = (trendingData?.movies ?? []).filter((m) => m.backdropUrl).slice(0, 10);
  const allMovies = browseData?.pages.flatMap((p) => p.movies) ?? [];
  const isFromDb = browseData?.pages.some((p) => p.source === "db");

  // Update background
  const handleHeroSelect = useCallback((m: Movie) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setBgOpacity(0);
    hoverTimer.current = setTimeout(() => { setBgUrl(m.backdropUrl || DEFAULT_BACKDROP); setBgOpacity(1); }, 300);
  }, []);
  const handleCardHover = (url: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setBgOpacity(0);
    hoverTimer.current = setTimeout(() => { setBgUrl(url); setBgOpacity(1); }, 220);
  };
  useEffect(() => {
    if (heroMovies.length > 0) setBgUrl(heroMovies[0].backdropUrl || DEFAULT_BACKDROP);
  }, [heroMovies.length]);

  // IntersectionObserver infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // "/" shortcut
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
        @keyframes shimmer-move { 0%{background-position:-400px 0} 100%{background-position:calc(400px + 100%) 0} }
        .shimmer-bg {
          background: linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.08) 80px,rgba(255,255,255,0.03) 160px);
          background-size:400px 100%; animation:shimmer-move 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Cinematic bg */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage:`url(${bgUrl})`, opacity:bgOpacity, transition:"opacity 0.4s ease" }} />
        <div className="absolute inset-0"
          style={{ background:"linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.72) 40%,rgba(0,0,0,0.94) 100%)" }} />
        <div className="absolute inset-0" style={{ backdropFilter:"blur(2px)" }} />
      </div>

      <div className="relative z-10 min-h-screen pb-24">
        {/* HERO */}
        <div className="pt-16">
          {trendingLoading ? <HeroSkeleton />
            : trendingError ? (
              <div className="pt-16 pb-8 text-center px-4">
                <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-2"
                  style={{ textShadow:"0 0 60px rgba(168,85,247,0.35)" }}>
                  ZAIX <span style={{ color:"#a855f7" }}>MOVIES</span>
                </h1>
                <p className="text-white/40 text-sm">10,000+ Indian &amp; world films</p>
              </div>
            ) : heroMovies.length > 0 ? (
              <FeaturedHero movies={heroMovies} onMovieSelect={handleHeroSelect} />
            ) : (
              <div className="pt-16 pb-6 text-center px-4">
                <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
                  style={{ textShadow:"0 0 60px rgba(168,85,247,0.35)" }}>
                  ZAIX <span style={{ color:"#a855f7" }}>MOVIES</span>
                </h1>
                <p className="text-white/50 text-lg max-w-md mx-auto">10,000+ Indian &amp; world films. Zero redirects.</p>
              </div>
            )
          }
        </div>

        {/* BROWSE */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full" style={{ background:"linear-gradient(to bottom,#a855f7,#7c3aed)" }} />
              Browse Films
            </h2>
            <span className="text-xs text-white/30">
              {allMovies.length > 0 ? `${allMovies.length}+ loaded` : ""}
            </span>
          </div>

          {/* Offline/DB fallback notice */}
          {isFromDb && <FallbackBanner />}

          {/* Search bar */}
          <div className="relative mb-5">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300"
              style={{
                background: searchFocused ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
                border: searchFocused ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
                backdropFilter:"blur(12px)",
              }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: searchFocused ? "#a855f7" : "rgba(255,255,255,0.3)" }} />
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder='Search Pushpa, Jawan, KGF… (press "/" to focus)'
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
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth:"none" }}>
            {GENRE_FILTERS.map((g) => (
              <button key={g.key}
                onClick={() => { setActiveGenre(g.key); setSearchInput(""); }}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={activeGenre === g.key
                  ? { background:"linear-gradient(135deg,#a855f7,#7c3aed)", color:"#fff", boxShadow:"0 0 20px rgba(168,85,247,0.4)" }
                  : { background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.08)" }}>
                {g.label}
              </button>
            ))}
          </div>

          {/* Movie grid — never shows a hard error; always shows skeleton or data */}
          {browseLoading && allMovies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 18 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : allMovies.length === 0 ? (
            <div className="text-center py-20">
              <Film className="w-12 h-12 text-purple-400/20 mx-auto mb-4" />
              <p className="text-white/30 text-lg font-semibold">No movies found</p>
              <p className="text-white/20 text-sm mt-1">Try a different search or genre</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {allMovies.map((m, i) => (
                <MovieCard key={`${m.id}-${i}`} movie={m} onHover={handleCardHover} />
              ))}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="flex justify-center mt-10 min-h-[40px]">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading more films…
              </div>
            )}
            {!hasNextPage && allMovies.length > 0 && !browseLoading && (
              <p className="text-white/15 text-xs">All films loaded</p>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
