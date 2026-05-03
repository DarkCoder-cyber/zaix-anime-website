import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, Clock, Star, Tv, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const TODAY_KEY = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.key ?? "monday";

async function fetchSchedule(day: string) {
  const res = await fetch(`/api/anime/schedule?day=${day}`);
  if (!res.ok) throw new Error("Failed to load schedule");
  return res.json();
}

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState<string>(TODAY_KEY);

  const { data, isLoading, error } = useQuery({
    queryKey: ["schedule", activeDay],
    queryFn: () => fetchSchedule(activeDay),
    staleTime: 10 * 60 * 1000,
  });

  const items: any[] = data?.data ?? [];

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-5xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-neon">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-heading text-white text-shadow-neon">Release Schedule</h1>
            <p className="text-muted-foreground text-sm">Daily anime airing — updated in real-time</p>
          </div>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-2">
          {DAYS.map((d) => {
            const isToday = d.key === TODAY_KEY;
            const isActive = d.key === activeDay;
            return (
              <button
                key={d.key}
                onClick={() => setActiveDay(d.key)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-black border-primary shadow-neon"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                }`}
              >
                {d.label}
                {isToday && (
                  <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${isActive ? "bg-black/20" : "bg-primary/20 text-primary"}`}>
                    TODAY
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule list */}
        {error ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-3xl">⚠️</div>
            <p className="text-white font-bold">Failed to load schedule</p>
            <p className="text-muted-foreground text-sm">Jikan API may be rate-limiting. Please try again shortly.</p>
          </div>
        ) : isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <Calendar className="w-12 h-12 text-primary/30" />
            <p className="text-muted-foreground">No releases scheduled for this day.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((anime: any, i: number) => (
              <Link
                key={`${anime.malId}-${i}`}
                href={`/watch/${anime.malId}`}
                className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/60 hover:shadow-neon transition-all duration-200"
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  <span className="text-xs font-bold text-muted-foreground/60 font-mono">#{i + 1}</span>
                </div>

                {/* Cover */}
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-secondary shrink-0">
                  {anime.image ? (
                    <img src={anime.image} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tv className="w-6 h-6 text-primary/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base">
                    {anime.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {anime.type && (
                      <Badge variant="outline" className="border-primary/30 text-primary/80 bg-primary/5 text-[10px] px-1.5">
                        {anime.type}
                      </Badge>
                    )}
                    {anime.score && (
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <Star className="w-3 h-3 fill-primary" /> {anime.score.toFixed(1)}
                      </span>
                    )}
                    {anime.episodes && (
                      <span className="text-xs text-muted-foreground">{anime.episodes} eps</span>
                    )}
                    {anime.airingTime && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" /> {anime.airingTime}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {anime.genres?.slice(0, 3).map((g: string) => (
                      <span key={g} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/50">{g}</span>
                    ))}
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
