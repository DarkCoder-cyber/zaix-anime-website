import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  Star, Play, Film, ChevronRight, ChevronLeft,
  Info, Clapperboard, Volume2, Search, X, Loader2, ChevronDown
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
  { key: "All", label: "All Films" },
  { key: "Bollywood", label: "Bollywood" },
  { key: "South Indian", label: "South Indian" },
  { key: "Hollywood", label: "Hollywood" },
];

const DEFAULT_BACKDROP =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1920&q=80&auto=format&fit=crop";

const HERO_INTERVAL = 6000;

function getMovieId(movie: Movie): number {
  return movie.tmdbId ?? movie.id;
}

function MovieCardSkeleton() {
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
    <div className="relative w-full h-[78vh] min-h-[500px] max-h-[760px] overflow-hidden rounded-none"
      style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="absolute inset-0 shimmer-bg" />
      <div className="absolute bottom-0 left-0 right-0 p-10 pb-16 flex flex-col gap-4">
        <div className="h-5 w-28 rounded-full shimmer-bg" />
        <div className="h-12 w-2/3 rounded-xl shimmer-bg" />
        <div className="h-4 w-full max-w-lg rounded shimmer-bg" />
        <div className="h-4 w-3/4 max-w-md rounded shimmer-bg" />
        <div className="flex gap-3 mt-2">
          <div className="h-12 w-36 rounded-xl shimmer-bg" />
          <div className="h-12 w-28 rounded-xl shimmer-bg" />
        </div>
      </div>
    </div>
  );
}

function MovieCard({ movie, onHover }: { movie: Movie; onHover: (url: string) => void }) {
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-[1.04] hover:z-10"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      onMouseEnter={() => onHover(movie.backdropUrl || DEFAULT_BACKDROP)}
      onClick={() => setLocation(`/movies/${getMovieId(movie)}`)}
    >
      <div className="aspect-[2/3] relative overflow-hidden bg-black">
        {!imgLoaded && <div className="absolute inset-0 shimmer-bg" />}
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)} onError={() => setImgLoaded(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
            <Film className="w-12 h-12 text-purple-400/40" />
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: "rgba(168,85,247,0.9)", boxShadow: "0 0 30px rgba(168,85,247,0.6)" }}>
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black"
            style={{ background: "rgba(255,165,0,0.9)", color: "#000" }}>HD</span>
          {movie.year && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.5)" }}>{movie.year}</span>
          )}
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

function FeaturedHero({ movies, onMovieSelect }: { movies: Movie[]; onMovieSelect: (movie: Movie) => void }) {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [backdropA, setBackdropA] = useState<string>("");
  const [backdropB, setBackdropB] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [contentVisible, setContentVisible] = useState(true);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const featured = movies[idx];

  useEffect(() => {
    if (!movies.length) return;
    const url = movies[0].backdropUrl || DEFAULT_BACKDROP;
    setBackdropA(url); setBackdropB(url);
  }, [movies]);

  const goTo = useCallback((newIdx: number) => {
    if (transitioning || newIdx === idx) return;
    const movie = movies[newIdx];
    const url = movie.backdropUrl || DEFAULT_BACKDROP;
    setTransitioning(true);
    setContentVisible(false);
    if (activeLayer === "A") { setBackdropB(url); setTimeout(() => setActiveLayer("B"), 30); }
    else { setBackdropA(url); setTimeout(() => setActiveLayer("A"), 30); }
    setTimeout(() => { setIdx(newIdx); setContentVisible(true); setTransitioning(false); }, 500);
    onMovieSelect(movie);
  }, [transitioning, idx, activeLayer, movies, onMovieSelect]);

  const next = useCallback(() => goTo((idx + 1) % movies.length), [goTo, idx, movies.length]);
  const prev = useCallback(() => goTo((idx - 1 + movies.length) % movies.length), [goTo, idx, movies.length]);

  useEffect(() => {
    if (movies.length < 2 || paused) { setProgress(0); return; }
    setProgress(0);
    const tickMs = 50; const steps = HERO_INTERVAL / tickMs; let tick = 0;
    progressRef.current = setInterval(() => {
      tick++; setProgress(tick / steps);
      if (tick >= steps) clearInterval(progressRef.current!);
    }, tickMs);
    autoRef.current = setTimeout(next, HERO_INTERVAL);
    return () => { clearInterval(progressRef.current!); clearTimeout(autoRef.current!); };
  }, [idx, paused, movies.length, next]);

  if (!featured) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: "500px", maxHeight: "760px" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropA})`, opacity: activeLayer === "A" ? 1 : 0 }} />
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropB})`, opacity: activeLayer === "B" ? 1 : 0 }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.1) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 30%, transparent 65%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%)" }} />
      </div>

      <div className="absolute inset-0 flex items-end pb-14 px-6 sm:px-10 lg:px-16"
        style={{ transition: "opacity 0.4s ease", opacity: contentVisible ? 1 : 0 }}>
        <div className="flex items-end justify-between w-full max-w-7xl mx-auto gap-6">
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.45)", color: "#c084fc" }}>
                <Clapperboard className="w-3 h-3" /> Featured Film
              </span>
              {featured.rating && parseFloat(featured.rating) > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#fbbf24" }}>
                  <Star className="w-3 h-3 fill-yellow-400" /> {featured.rating}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-black"
                style={{ background: "rgba(255,165,0,0.9)", color: "#000" }}>HD</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight"
              style={{ textShadow: "0 2px 40px rgba(0,0,0,0.8)" }}>{featured.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                {featured.genre}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Volume2 className="w-3.5 h-3.5" /> {featured.language}
              </span>
              {featured.year && <span className="text-xs text-white/35">{featured.year}</span>}
            </div>
            {featured.description && (
              <p className="text-sm sm:text-base text-white/60 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-md">
                {featured.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1">
              <button onClick={() => setLocation(`/movies/${getMovieId(featured)}`)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-black text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 30px rgba(168,85,247,0.5)" }}>
                <Play className="w-4 h-4 fill-white" /> Watch Now
              </button>
              <button onClick={() => setLocation(`/movies/${getMovieId(featured)}`)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}>
                <Info className="w-4 h-4" /> More Info
              </button>
            </div>
          </div>
          {featured.poster && (
            <div className="hidden lg:block shrink-0">
              <img src={featured.poster} alt={featured.title} className="w-40 xl:w-48 rounded-2xl shadow-2xl"
                style={{ border: "2px solid rgba(168,85,247,0.4)", boxShadow: "0 0 60px rgba(168,85,247,0.25), 0 25px 60px rgba(0,0,0,0.8)", opacity: contentVisible ? 1 : 0, transition: "opacity 0.4s ease" }} />
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-6 sm:left-10 lg:left-16 flex items-center gap-3">
        {movies.length > 1 && movies.map((m, i) => (
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

      {movies.length > 1 && (
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

export default function MoviesPage() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState(DEFAULT_BACKDROP);
  const [bgOpacity, setBgOpacity] = useState(1);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trending from TMDB for hero
  const { data: trendingData, isLoading: trendingLoading } = useQuery<{ movies: Movie[] }>({
    queryKey: ["movies-tmdb-trending"],
    queryFn: async () => {
      const res = await fetch("/api/movies/tmdb/trending");
      if (!res.ok) throw new Error("Failed to fetch trending");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Paginated browse
  const endpoint = activeGenre === "South Indian"
    ? "/api/movies/tmdb/south"
    : activeGenre === "Hollywood"
    ? "/api/movies/tmdb/search?genre=Hollywood"
    : "/api/movies/tmdb/bollywood";

  const searchEndpoint = searchQuery.trim()
    ? `/api/movies/tmdb/search?q=${encodeURIComponent(searchQuery.trim())}&genre=${encodeURIComponent(activeGenre)}`
    : null;

  const { data: browseData, isLoading: browseLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<{ movies: Movie[]; totalPages?: number; page?: number }>({
      queryKey: ["movies-browse", activeGenre, searchQuery],
      queryFn: async ({ pageParam = 1 }) => {
        const url = searchEndpoint
          ? `${searchEndpoint}&page=${pageParam}`
          : `${endpoint}&page=${pageParam}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch movies");
        return res.json();
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const totalPages = lastPage.totalPages ?? 1;
        const nextPage = allPages.length + 1;
        return nextPage <= Math.min(totalPages, 20) ? nextPage : undefined;
      },
      staleTime: 5 * 60 * 1000,
    });

  const trendingMovies = trendingData?.movies ?? [];
  const heroMovies = trendingMovies.filter((m) => m.backdropUrl).slice(0, 10);
  const allBrowseMovies = browseData?.pages.flatMap((p) => p.movies) ?? [];

  const isLoading = trendingLoading && browseLoading;

  const handleHeroMovie = useCallback((movie: Movie) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setBgOpacity(0);
    hoverTimeout.current = setTimeout(() => { setBgUrl(movie.backdropUrl || DEFAULT_BACKDROP); setBgOpacity(1); }, 300);
  }, []);

  const handleCardHover = (url: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setBgOpacity(0);
    hoverTimeout.current = setTimeout(() => { setBgUrl(url); setBgOpacity(1); }, 220);
  };

  useEffect(() => {
    if (heroMovies.length > 0) setBgUrl(heroMovies[0].backdropUrl || DEFAULT_BACKDROP);
  }, [heroMovies.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearchQuery(""); searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const showHero = !trendingLoading && heroMovies.length > 0;

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

      {/* Fixed cinematic background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgUrl})`, opacity: bgOpacity, transition: "opacity 0.4s ease" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.94) 100%)" }} />
        <div className="absolute inset-0" style={{ backdropFilter: "blur(2px)" }} />
      </div>

      <div className="relative z-10 min-h-screen pb-24">
        {/* HERO */}
        <div className="pt-16">
          {trendingLoading ? <HeroSkeleton /> : showHero ? (
            <FeaturedHero movies={heroMovies} onMovieSelect={handleHeroMovie} />
          ) : (
            <div className="pt-16 pb-6 text-center px-4">
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
                style={{ textShadow: "0 0 60px rgba(168,85,247,0.35)" }}>
                ZAIX <span style={{ color: "#a855f7" }}>MOVIES</span>
              </h1>
              <p className="text-white/50 text-lg max-w-md mx-auto">10,000+ Indian & world films. Zero redirects.</p>
            </div>
          )}
        </div>

        {/* BROWSE */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
              Browse Films
            </h2>
            <span className="text-xs text-white/30">
              {allBrowseMovies.length > 0 ? `${allBrowseMovies.length}+ loaded` : ""}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-5 group">
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300"
              style={{
                background: searchFocused ? "rgba(168,85,247,0.08)" : "rgba(255,255,255,0.04)",
                border: searchFocused ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}>
              <Search className="w-4 h-4 shrink-0 transition-colors duration-200"
                style={{ color: searchFocused ? "#a855f7" : "rgba(255,255,255,0.3)" }} />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder='Search movies… (press "/" to focus)'
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              {!searchFocused && !searchQuery && (
                <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-white/20 border border-white/10">/</kbd>
              )}
            </div>
          </div>

          {/* Genre tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 scrollbar-none">
            {GENRE_FILTERS.map((g) => (
              <button key={g.key} onClick={() => { setActiveGenre(g.key); }}
                className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={activeGenre === g.key
                  ? { background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {g.label}
              </button>
            ))}
          </div>

          {/* Movie grid */}
          {browseLoading && allBrowseMovies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 18 }).map((_, i) => <MovieCardSkeleton key={i} />)}
            </div>
          ) : allBrowseMovies.length === 0 ? (
            <div className="text-center py-20">
              <Film className="w-12 h-12 text-purple-400/20 mx-auto mb-4" />
              <p className="text-white/30 text-lg font-semibold">No movies found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {allBrowseMovies.map((movie, i) => (
                  <MovieCard key={`${movie.id}-${i}`} movie={movie} onHover={handleCardHover} />
                ))}
              </div>

              {/* Load More */}
              {hasNextPage && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
                  >
                    {isFetchingNextPage ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Loading more…</>
                    ) : (
                      <><ChevronDown className="w-4 h-4" /> Load More Films</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
