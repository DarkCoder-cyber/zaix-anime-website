import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Play, Star, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroAnime {
  malId: number;
  title: string;
  image: string;
  score?: number | null;
  episodes?: number | null;
  year?: number | null;
  type?: string | null;
  synopsis?: string | null;
  genres: string[];
  status?: string | null;
}

interface TrendingAnimeHeroProps {
  anime: HeroAnime[];
  loading?: boolean;
}

const SLIDE_INTERVAL = 6500;

function HeroSlide({ item, active, prev }: { item: HeroAnime; active: boolean; prev: boolean }) {
  return (
    <div
      className="absolute inset-0 transition-opacity duration-700"
      style={{ opacity: active ? 1 : 0, zIndex: active ? 2 : prev ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
    >
      {/* Backdrop — blurred poster */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={item.image}
          alt=""
          className="w-full h-full object-cover scale-110"
          style={{ filter: "blur(18px) brightness(0.45) saturate(1.2)", transform: "scale(1.12)" }}
          loading="eager"
          decoding="async"
        />
        {/* Cinematic vignette + bottom fade */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.6) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.98) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(168,85,247,0.08) 0%, transparent 65%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end sm:items-center pb-8 sm:pb-0 px-5 sm:px-10 lg:px-16">
        <div className="flex items-end sm:items-center gap-6 lg:gap-10 w-full max-w-5xl">
          {/* Poster */}
          <div
            className="hidden sm:block shrink-0 rounded-xl overflow-hidden shadow-2xl"
            style={{
              width: "clamp(100px, 14vw, 180px)",
              aspectRatio: "3/4",
              border: "2px solid rgba(168,85,247,0.35)",
              boxShadow: "0 0 40px rgba(168,85,247,0.25), 0 20px 60px rgba(0,0,0,0.7)",
            }}
          >
            <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="eager" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Language badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.5)" }}>SUB</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.5)" }}>DUB</span>
              {item.type && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  {item.type}
                </span>
              )}
            </div>

            <h2
              className="font-black font-heading text-white leading-none"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 2.8rem)",
                textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                letterSpacing: "-0.02em",
              }}
            >
              {item.title}
            </h2>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {item.score && (
                <span className="flex items-center gap-1 text-sm font-bold text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-yellow-400" />
                  {item.score.toFixed(1)}
                </span>
              )}
              {item.year && <span className="text-sm text-white/50 font-medium">{item.year}</span>}
              {item.episodes && <span className="text-sm text-white/50 font-medium">{item.episodes} eps</span>}
              {item.status && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: item.status === "Currently Airing" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.07)",
                    color: item.status === "Currently Airing" ? "#4ade80" : "rgba(255,255,255,0.5)",
                    border: item.status === "Currently Airing" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {item.status === "Currently Airing" ? "● AIRING" : item.status.toUpperCase()}
                </span>
              )}
            </div>

            {/* Genre pills */}
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.slice(0, 4).map((g) => (
                  <span key={g} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {item.synopsis && (
              <p className="text-sm text-white/55 line-clamp-2 max-w-xl leading-relaxed hidden sm:block">
                {item.synopsis}
              </p>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mt-1">
              <Link href={`/watch/${item.malId}`}>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95"
                  style={{
                    background: "rgba(168,85,247,1)",
                    color: "#000",
                    boxShadow: "0 0 20px rgba(168,85,247,0.5), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <Play className="w-4 h-4 fill-black" /> Watch Now
                </button>
              </Link>
              <Link href={`/watch/${item.malId}`}>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 hover:bg-white/15"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Info className="w-4 h-4" /> More Info
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TrendingAnimeHero({ anime, loading }: TrendingAnimeHeroProps) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const items = anime.slice(0, 6);

  const goTo = useCallback((idx: number) => {
    setPrev(current);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => {
    if (items.length === 0) return;
    goTo((current + 1) % items.length);
  }, [current, items.length, goTo]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    goTo((current - 1 + items.length) % items.length);
  }, [current, items.length, goTo]);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, items.length]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, SLIDE_INTERVAL);
  };

  if (loading) {
    return (
      <div className="relative w-full overflow-hidden" style={{ height: "clamp(340px, 52vw, 560px)" }}>
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="absolute inset-0 shimmer-bg opacity-40" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 flex flex-col gap-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-9 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/4 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ height: "clamp(340px, 52vw, 560px)", border: "1px solid rgba(168,85,247,0.15)" }}
    >
      {/* Slides */}
      {items.map((item, i) => (
        <HeroSlide
          key={item.malId}
          item={item}
          active={i === current}
          prev={i === prev}
        />
      ))}

      {/* Arrow nav */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => { goPrev(); resetTimer(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all opacity-50 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => { next(); resetTimer(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all opacity-50 hover:opacity-100"
            style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { goTo(i); resetTimer(); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background: i === current ? "#a855f7" : "rgba(255,255,255,0.3)",
                boxShadow: i === current ? "0 0 8px rgba(168,85,247,0.8)" : "none",
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {items.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-20 overflow-hidden">
          <div
            key={current}
            className="h-full bg-primary"
            style={{
              animation: `hero-progress ${SLIDE_INTERVAL}ms linear forwards`,
              boxShadow: "0 0 8px rgba(168,85,247,0.7)",
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes hero-progress { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  );
}
