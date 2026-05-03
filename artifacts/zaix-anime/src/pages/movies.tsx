import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Star, Play, Film, ChevronRight, ChevronLeft,
  Info, Clapperboard, Volume2, Search, X
} from "lucide-react";

interface Movie {
  id: number;
  title: string;
  poster: string | null;
  backdropUrl: string | null;
  streamUrl: string;
  genre: string;
  language: string;
  rating: string | null;
  description: string | null;
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

/* ─── Shimmer skeleton card ─── */
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

/* ─── Movie grid card ─── */
function MovieCard({ movie, onHover }: { movie: Movie; onHover: (url: string) => void }) {
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-[1.04] hover:z-10"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      onMouseEnter={() => onHover(movie.backdropUrl || DEFAULT_BACKDROP)}
      onClick={() => setLocation(`/movies/${movie.id}`)}
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
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(0,0,0,0.75)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }}>हिंदी</span>
        </div>

        {movie.rating && (
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

/* ─── Featured Hero Banner ─── */
function FeaturedHero({
  movies, onMovieSelect,
}: {
  movies: Movie[];
  onMovieSelect: (movie: Movie) => void;
}) {
  const [, setLocation] = useLocation();
  const [idx, setIdx] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  /* two backdrop layers for crossfade */
  const [backdropA, setBackdropA] = useState<string>("");
  const [backdropB, setBackdropB] = useState<string>("");
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [contentVisible, setContentVisible] = useState(true);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const featured = movies[idx];

  /* initialise layers */
  useEffect(() => {
    if (!movies.length) return;
    const url = movies[0].backdropUrl || DEFAULT_BACKDROP;
    setBackdropA(url);
    setBackdropB(url);
  }, [movies]);

  /* crossfade to a new index */
  const goTo = useCallback((newIdx: number) => {
    if (transitioning || newIdx === idx) return;
    const movie = movies[newIdx];
    const url = movie.backdropUrl || DEFAULT_BACKDROP;
    setTransitioning(true);
    setContentVisible(false);
    if (activeLayer === "A") {
      setBackdropB(url);
      setTimeout(() => setActiveLayer("B"), 30);
    } else {
      setBackdropA(url);
      setTimeout(() => setActiveLayer("A"), 30);
    }
    setTimeout(() => {
      setIdx(newIdx);
      setContentVisible(true);
      setTransitioning(false);
    }, 500);
    onMovieSelect(movie);
  }, [transitioning, idx, activeLayer, movies, onMovieSelect]);

  const next = useCallback(() => goTo((idx + 1) % movies.length), [goTo, idx, movies.length]);
  const prev = useCallback(() => goTo((idx - 1 + movies.length) % movies.length), [goTo, idx, movies.length]);

  /* auto-rotate with smooth progress bar */
  useEffect(() => {
    if (movies.length < 2 || paused) { setProgress(0); return; }
    setProgress(0);
    const tickMs = 50;
    const steps = HERO_INTERVAL / tickMs;
    let tick = 0;
    progressRef.current = setInterval(() => {
      tick++;
      setProgress(tick / steps);
      if (tick >= steps) {
        clearInterval(progressRef.current!);
      }
    }, tickMs);
    autoRef.current = setTimeout(next, HERO_INTERVAL);
    return () => {
      clearInterval(progressRef.current!);
      clearTimeout(autoRef.current!);
    };
  }, [idx, paused, movies.length, next]);

  if (!featured) return null;

  const backdropUrl = activeLayer === "A" ? backdropA : backdropB;
  const prevBackdropUrl = activeLayer === "A" ? backdropB : backdropA;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "78vh", minHeight: "500px", maxHeight: "760px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop crossfade layers */}
      <div className="absolute inset-0">
        {/* Layer A */}
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropA})`, opacity: activeLayer === "A" ? 1 : 0 }} />
        {/* Layer B */}
        <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{ backgroundImage: `url(${backdropB})`, opacity: activeLayer === "B" ? 1 : 0 }} />
        {/* Gradient overlays */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.1) 100%)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 30%, transparent 65%)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%)" }} />
      </div>

      {/* Content */}
      <div
        className="absolute inset-0 flex items-end pb-14 px-6 sm:px-10 lg:px-16"
        style={{ transition: "opacity 0.4s ease", opacity: contentVisible ? 1 : 0 }}
      >
        <div className="flex items-end justify-between w-full max-w-7xl mx-auto gap-6">
          {/* Left: text & buttons */}
          <div className="flex flex-col gap-4 max-w-xl">
            {/* Label */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest"
                style={{ background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.45)", color: "#c084fc" }}>
                <Clapperboard className="w-3 h-3" />
                Featured Film
              </span>
              {featured.rating && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)", color: "#fbbf24" }}>
                  <Star className="w-3 h-3 fill-yellow-400" /> {featured.rating}
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-black"
                style={{ background: "rgba(255,165,0,0.9)", color: "#000" }}>HD</span>
            </div>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight"
              style={{ textShadow: "0 2px 40px rgba(0,0,0,0.8)" }}>
              {featured.title}
            </h2>

            {/* Meta tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                {featured.genre}
              </span>
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Volume2 className="w-3.5 h-3.5" /> {featured.language} Audio
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
                हिंदी
              </span>
            </div>

            {/* Description */}
            {featured.description && (
              <p className="text-sm sm:text-base text-white/60 leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-md">
                {featured.description}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setLocation(`/movies/${featured.id}`)}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-black text-white transition-all duration-200 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 30px rgba(168,85,247,0.5)" }}
              >
                <Play className="w-4 h-4 fill-white" />
                Watch Now
              </button>
              <button
                onClick={() => setLocation(`/movies/${featured.id}`)}
                className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
              >
                <Info className="w-4 h-4" />
                More Info
              </button>
            </div>
          </div>

          {/* Right: poster thumbnail (desktop only) */}
          {featured.poster && (
            <div className="hidden lg:block shrink-0">
              <div className="relative">
                <img
                  src={featured.poster}
                  alt={featured.title}
                  className="w-40 xl:w-48 rounded-2xl shadow-2xl"
                  style={{
                    border: "2px solid rgba(168,85,247,0.4)",
                    boxShadow: "0 0 60px rgba(168,85,247,0.25), 0 25px 60px rgba(0,0,0,0.8)",
                    transition: "opacity 0.4s ease",
                    opacity: contentVisible ? 1 : 0,
                  }}
                />
                {/* Glow under poster */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full"
                  style={{ background: "rgba(168,85,247,0.3)", filter: "blur(16px)" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar + dot indicators */}
      <div className="absolute bottom-4 left-6 sm:left-10 lg:left-16 flex items-center gap-3">
        {movies.length > 1 && movies.map((m, i) => (
          <button
            key={m.id}
            onClick={() => goTo(i)}
            className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{
              width: i === idx ? "48px" : "8px",
              background: i === idx ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.25)",
            }}
          >
            {i === idx && (
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  background: "linear-gradient(90deg, #a855f7, #c084fc)",
                  transition: paused ? "none" : "width 0.05s linear",
                  boxShadow: "0 0 8px rgba(168,85,247,0.6)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Prev / Next arrows */}
      {movies.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function MoviesPage() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [bgUrl, setBgUrl] = useState(DEFAULT_BACKDROP);
  const [bgOpacity, setBgOpacity] = useState(1);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery<{ movies: Movie[] }>({
    queryKey: ["movies"],
    queryFn: async () => {
      const res = await fetch("/api/movies");
      if (!res.ok) throw new Error("Failed to fetch movies");
      return res.json();
    },
    staleTime: 60000,
  });

  const allMovies = data?.movies ?? [];

  /* movies with a backdrop (for hero rotation) */
  const heroMovies = allMovies
    .filter((m) => m.backdropUrl)
    .sort((a, b) => parseFloat(b.rating ?? "0") - parseFloat(a.rating ?? "0"))
    .slice(0, 8);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  /* filtered list for the grid — genre + search combined */
  const gridMovies = allMovies.filter((m) => {
    const genreMatch = activeGenre === "All" || m.genre === activeGenre;
    const searchMatch =
      !normalizedQuery ||
      m.title.toLowerCase().includes(normalizedQuery) ||
      m.genre.toLowerCase().includes(normalizedQuery) ||
      m.description?.toLowerCase().includes(normalizedQuery) ||
      m.language.toLowerCase().includes(normalizedQuery);
    return genreMatch && searchMatch;
  });

  /* sync fixed bg when hero changes */
  const handleHeroMovie = useCallback((movie: Movie) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setBgOpacity(0);
    hoverTimeout.current = setTimeout(() => {
      setBgUrl(movie.backdropUrl || DEFAULT_BACKDROP);
      setBgOpacity(1);
    }, 300);
  }, []);

  /* sync fixed bg on card hover */
  const handleCardHover = (url: string) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setBgOpacity(0);
    hoverTimeout.current = setTimeout(() => {
      setBgUrl(url);
      setBgOpacity(1);
    }, 220);
  };

  /* set initial bg from first movie */
  useEffect(() => {
    if (allMovies.length > 0) {
      setBgUrl(allMovies[0].backdropUrl || DEFAULT_BACKDROP);
    }
  }, [allMovies]);

  /* "/" shortcut to focus search */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearchQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const showHero = !isLoading && heroMovies.length > 0;

  return (
    <>
      <style>{`
        @keyframes shimmer-move {
          0%   { background-position: -400px 0; }
          100% { background-position: calc(400px + 100%) 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.03) 0px,
            rgba(255,255,255,0.08) 80px,
            rgba(255,255,255,0.03) 160px
          );
          background-size: 400px 100%;
          animation: shimmer-move 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Fixed cinematic background (reacts to card hover) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgUrl})`, opacity: bgOpacity, transition: "opacity 0.4s ease" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.94) 100%)" }} />
        <div className="absolute inset-0" style={{ backdropFilter: "blur(2px)" }} />
      </div>

      <div className="relative z-10 min-h-screen pb-24">

        {/* ── HERO SECTION ── */}
        <div className="pt-16">
          {isLoading ? (
            <HeroSkeleton />
          ) : showHero ? (
            <FeaturedHero movies={heroMovies} onMovieSelect={handleHeroMovie} />
          ) : (
            /* fallback header when no movies have backdrops yet */
            <div className="pt-16 pb-6 text-center px-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold uppercase tracking-widest"
                style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
                <Film className="w-3.5 h-3.5" />
                Zaix Movies — Cinematic Universe
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
                style={{ textShadow: "0 0 60px rgba(168,85,247,0.35)" }}>
                ZAIX <span style={{ color: "#a855f7", textShadow: "0 0 30px rgba(168,85,247,0.8)" }}>MOVIES</span>
              </h1>
              <p className="text-white/50 text-lg max-w-md mx-auto">
                Premium Hindi films. Zero redirects. Cinema-quality streaming.
              </p>
            </div>
          )}
        </div>

        {/* ── BROWSE SECTION ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10">

          {/* Section label + live count */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #a855f7, #7c3aed)" }} />
              Browse All Films
            </h2>
            {!isLoading && (
              <span className="text-xs transition-all duration-200"
                style={{ color: normalizedQuery ? "rgba(168,85,247,0.8)" : "rgba(255,255,255,0.3)" }}>
                {normalizedQuery
                  ? `${gridMovies.length} result${gridMovies.length !== 1 ? "s" : ""} for "${searchQuery.trim()}"`
                  : `${gridMovies.length} available`}
              </span>
            )}
          </div>

          {/* ── Search bar ── */}
          <div className="relative mb-5 group">
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300"
              style={{
                background: searchFocused
                  ? "rgba(168,85,247,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: searchFocused
                  ? "1.5px solid rgba(168,85,247,0.5)"
                  : "1.5px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(16px)",
                boxShadow: searchFocused
                  ? "0 0 0 4px rgba(168,85,247,0.08), 0 4px 24px rgba(168,85,247,0.12)"
                  : "none",
              }}
              onClick={() => searchRef.current?.focus()}
            >
              <Search
                className="shrink-0 transition-colors duration-200"
                style={{
                  width: "18px", height: "18px",
                  color: searchFocused || normalizedQuery
                    ? "rgba(168,85,247,0.9)"
                    : "rgba(255,255,255,0.3)",
                }}
              />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search movies by title, genre, language…"
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none caret-purple-400 font-medium"
              />
              {/* Live result count badge while typing */}
              {normalizedQuery && (
                <span
                  className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all duration-200"
                  style={{
                    background: "rgba(168,85,247,0.15)",
                    color: "#c084fc",
                    border: "1px solid rgba(168,85,247,0.3)",
                  }}
                >
                  {gridMovies.length}
                </span>
              )}
              {/* Clear button */}
              {normalizedQuery && (
                <button
                  onMouseDown={(e) => { e.preventDefault(); setSearchQuery(""); searchRef.current?.focus(); }}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              )}
            </div>

            {/* Keyboard shortcut hint */}
            {!searchFocused && !normalizedQuery && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <kbd className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  /
                </kbd>
              </div>
            )}
          </div>

          {/* Genre filter pills */}
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {GENRE_FILTERS.map((f) => (
              <button key={f.key}
                onClick={() => { setActiveGenre(f.key); }}
                className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200"
                style={activeGenre === f.key
                  ? { background: "#a855f7", color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.5)", transform: "scale(1.05)" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }
                }>
                {f.label}
              </button>
            ))}
            {/* Active search chip */}
            {normalizedQuery && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-bold"
                style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.35)" }}>
                <Search className="w-3.5 h-3.5" />
                {searchQuery.trim()}
                <button onMouseDown={() => setSearchQuery("")} className="hover:text-white transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => <MovieCardSkeleton key={i} />)}
            </div>
          ) : gridMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-28 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                {normalizedQuery ? (
                  <Search className="w-9 h-9 text-purple-400/40" />
                ) : (
                  <Film className="w-9 h-9 text-purple-400/40" />
                )}
              </div>
              {normalizedQuery ? (
                <>
                  <p className="text-white/40 text-lg font-semibold mb-1">
                    No results for &ldquo;{searchQuery.trim()}&rdquo;
                  </p>
                  <p className="text-white/25 text-sm mb-5">Try a different title, genre, or language</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(168,85,247,0.15)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)" }}
                  >
                    <X className="w-4 h-4" /> Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-white/40 text-lg font-semibold mb-1">
                    {allMovies.length === 0 ? "No movies yet" : `No ${activeGenre} films yet`}
                  </p>
                  <p className="text-white/25 text-sm">
                    {allMovies.length === 0
                      ? "Admin can add movies via the upload panel"
                      : "Try a different genre filter above"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {gridMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onHover={handleCardHover} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
