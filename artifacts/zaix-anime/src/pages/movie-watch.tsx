import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Film, Play, Globe } from "lucide-react";
import { VideoPlayer, type StreamSource } from "@/components/video-player";

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

function isM3U8(url: string): boolean {
  return url.includes(".m3u8") || url.includes("m3u8");
}

export default function MovieWatchPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useQuery<{ movie: Movie }>({
    queryKey: ["movie", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/movies/${params.id}`);
      if (!res.ok) throw new Error("Movie not found");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const movie = data?.movie;

  const sources: StreamSource[] = movie
    ? [{ url: movie.streamUrl, quality: "HD", isM3U8: isM3U8(movie.streamUrl) }]
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 rounded-full animate-spin"
            style={{ borderColor: "rgba(168,85,247,0.3)", borderTopColor: "#a855f7" }} />
          <p className="text-white/40 text-sm">Loading movie…</p>
        </div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <Film className="w-14 h-14 text-purple-400/30" />
        <p className="text-white/50 text-lg font-semibold">Movie not found</p>
        <button
          onClick={() => setLocation("/movies")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Movies
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Cinematic Backdrop Header */}
      {movie.backdropUrl && (
        <div className="relative w-full h-48 sm:h-64 overflow-hidden">
          <img
            src={movie.backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover object-center"
            style={{ filter: "brightness(0.35) saturate(1.2)" }}
          />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.95) 100%)" }} />
        </div>
      )}

      <div className={`max-w-5xl mx-auto px-4 ${movie.backdropUrl ? "-mt-20 relative z-10" : "pt-24"} pb-24`}>
        {/* Back button */}
        <button
          onClick={() => setLocation("/movies")}
          className="flex items-center gap-2 mb-6 text-sm font-semibold transition-colors hover:text-purple-400"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Movies
        </button>

        {/* Movie Info */}
        <div className="flex items-start gap-5 mb-8">
          {movie.poster && (
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-24 sm:w-32 shrink-0 rounded-xl shadow-2xl"
              style={{ border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 30px rgba(0,0,0,0.8)" }}
            />
          )}
          <div className="flex flex-col gap-3 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight"
              style={{ textShadow: "0 0 30px rgba(168,85,247,0.2)" }}>
              {movie.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2">
              {/* HD Badge */}
              <span className="px-2 py-0.5 rounded text-xs font-black"
                style={{ background: "rgba(255,165,0,0.9)", color: "#000" }}>
                HD
              </span>
              {/* Hindi Badge */}
              <span className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.3)" }}>
                हिंदी
              </span>
              {/* Genre */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {movie.genre}
              </span>
              {/* Language */}
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Globe className="w-3.5 h-3.5" /> {movie.language}
              </span>
              {/* Rating */}
              {movie.rating && (
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" /> {movie.rating}
                </span>
              )}
            </div>

            {movie.description && (
              <p className="text-sm text-white/55 leading-relaxed max-w-xl line-clamp-3 sm:line-clamp-none">
                {movie.description}
              </p>
            )}
          </div>
        </div>

        {/* Now Playing Label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400" />
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Now Playing</span>
          </div>
        </div>

        {/* Video Player */}
        <VideoPlayer sources={sources} posterUrl={movie.poster ?? undefined} />

        {/* Bottom info strip */}
        <div className="mt-6 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{movie.title}</p>
              <p className="text-[10px] text-white/30">{movie.genre} · {movie.language}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25 px-2 py-1 rounded"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              HD Quality
            </span>
            <span className="text-[10px] text-purple-400/70 px-2 py-1 rounded"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              Hindi Audio
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
