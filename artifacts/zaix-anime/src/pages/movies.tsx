import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Play, Film, ChevronRight } from "lucide-react";

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

function MovieCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="aspect-[2/3] shimmer-bg rounded-t-2xl" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 w-3/4 rounded shimmer-bg" />
        <div className="h-3 w-1/2 rounded shimmer-bg" />
      </div>
    </div>
  );
}

function MovieCard({ movie, onHover }: { movie: Movie; onHover: (url: string) => void }) {
  const [, setLocation] = useLocation();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-[1.03] hover:z-10"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      onMouseEnter={() => onHover(movie.backdropUrl || DEFAULT_BACKDROP)}
      onClick={() => setLocation(`/movies/${movie.id}`)}
    >
      {/* Poster */}
      <div className="aspect-[2/3] relative overflow-hidden bg-black">
        {!imgLoaded && <div className="absolute inset-0 shimmer-bg" />}
        {movie.poster ? (
          <img
            src={movie.poster}
            alt={movie.title}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
            <Film className="w-12 h-12 text-purple-400/40" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110"
              style={{ background: "rgba(168,85,247,0.9)", boxShadow: "0 0 30px rgba(168,85,247,0.6)" }}>
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide"
            style={{ background: "rgba(255,165,0,0.9)", color: "#000", backdropFilter: "blur(8px)" }}>
            HD
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "rgba(0,0,0,0.75)", color: "#a855f7", backdropFilter: "blur(8px)", border: "1px solid rgba(168,85,247,0.4)" }}>
            हिंदी
          </span>
        </div>

        {/* Rating badge */}
        {movie.rating && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] font-bold text-yellow-400">{movie.rating}</span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-3" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}>
        <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">{movie.title}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
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

export default function MoviesPage() {
  const [activeGenre, setActiveGenre] = useState("All");
  const [bgUrl, setBgUrl] = useState(DEFAULT_BACKDROP);
  const [bgOpacity, setBgOpacity] = useState(1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery<{ movies: Movie[] }>({
    queryKey: ["movies", activeGenre],
    queryFn: async () => {
      const url = activeGenre === "All" ? "/api/movies" : `/api/movies?genre=${encodeURIComponent(activeGenre)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch movies");
      return res.json();
    },
    staleTime: 60000,
  });

  const movies = data?.movies ?? [];

  useEffect(() => {
    if (movies.length > 0 && movies[0].backdropUrl) {
      setBgUrl(movies[0].backdropUrl);
    } else {
      setBgUrl(DEFAULT_BACKDROP);
    }
  }, [movies]);

  const handleCardHover = (url: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setBgOpacity(0);
    timeoutRef.current = setTimeout(() => {
      setBgUrl(url);
      setBgOpacity(1);
    }, 250);
  };

  return (
    <>
      <style>{`
        @keyframes shimmer-move {
          0% { background-position: -400px 0; }
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

      {/* Cinematic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${bgUrl})`,
            opacity: bgOpacity,
            transition: "opacity 0.4s ease",
          }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.72) 40%, rgba(0,0,0,0.92) 100%)" }} />
        <div className="absolute inset-0" style={{ backdropFilter: "blur(1px)" }} />
      </div>

      <div className="relative z-10 min-h-screen pt-20 pb-24 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Hero Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 text-xs font-bold uppercase tracking-widest"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
              <Film className="w-3.5 h-3.5" />
              Zaix Movies — Cinematic Universe
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3"
              style={{ textShadow: "0 0 60px rgba(168,85,247,0.35)", fontFamily: "'system-ui', sans-serif" }}>
              ZAIX <span style={{ color: "#a855f7", textShadow: "0 0 30px rgba(168,85,247,0.8)" }}>MOVIES</span>
            </h1>
            <p className="text-white/50 text-lg max-w-md mx-auto">
              Premium Hindi films. Zero redirects. Cinema-quality streaming.
            </p>
          </div>

          {/* Genre Filter Tabs */}
          <div className="flex items-center gap-2 justify-center flex-wrap mb-10">
            {GENRE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveGenre(f.key)}
                className="px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200"
                style={activeGenre === f.key
                  ? { background: "rgba(168,85,247,1)", color: "#fff", boxShadow: "0 0 20px rgba(168,85,247,0.5)", transform: "scale(1.05)" }
                  : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Movie Count */}
          {!isLoading && (
            <div className="flex items-center gap-2 mb-6">
              <span className="text-white/30 text-sm">{movies.length} film{movies.length !== 1 ? "s" : ""} available</span>
              {activeGenre !== "All" && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                  <span className="text-purple-400 text-sm font-semibold">{activeGenre}</span>
                </>
              )}
            </div>
          )}

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <MovieCardSkeleton key={i} />
              ))}
            </div>
          ) : movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <Film className="w-9 h-9 text-purple-400/40" />
              </div>
              <p className="text-white/40 text-lg font-semibold mb-1">No movies yet</p>
              <p className="text-white/25 text-sm">Admin can add movies via the upload panel</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onHover={handleCardHover} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
