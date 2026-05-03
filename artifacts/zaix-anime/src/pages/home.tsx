import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { MangaCard } from "@/components/manga-card";
import { CATEGORIES } from "@/data/mock";
import { useGetTrendingAnime, useGetRecentAnime, getGetTrendingAnimeQueryKey, getGetRecentAnimeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import heroBg from "@/assets/hero-bg.png";
import { Search, History, Sparkles, BookOpen, Users } from "lucide-react";
import { useRecentlyVisited } from "@/hooks/use-local-store";
import { cachedFetchJson } from "@/hooks/api-cache";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState<ContentTab>("anime");
  const [, setLocation] = useLocation();
  const { recent } = useRecentlyVisited();
  const liveUsers = useLiveUsers();

  const { data: trendingData, isLoading: trendingLoading } = useGetTrendingAnime({ limit: 12 }, { query: { queryKey: getGetTrendingAnimeQueryKey({ limit: 12 }) } });
  const { data: recentData, isLoading: recentLoading } = useGetRecentAnime({ limit: 8 }, { query: { queryKey: getGetRecentAnimeQueryKey({ limit: 8 }) } });
  const { data: mangaData, isLoading: mangaLoading, error: mangaError } = useQuery({ queryKey: ["manga-trending", "manga"], queryFn: () => fetchMangaTrending("manga"), enabled: activeTab === "manga", retry: 1 });
  const { data: manhwaData, isLoading: manhwaLoading, error: manhwaError } = useQuery({ queryKey: ["manga-trending", "manhwa"], queryFn: () => fetchMangaTrending("manhwa"), enabled: activeTab === "manhwa", retry: 1 });
  const { data: donghuaData, isLoading: donghuaLoading, error: donghuaError } = useQuery({ queryKey: ["donghua"], queryFn: fetchDonghua, enabled: activeTab === "donghua", retry: 1 });

  const trendingAnime = trendingData?.data ?? [];
  const recentAnime = recentData?.data ?? [];
  const mangaList = mangaData?.data ?? [];
  const manhwaList = manhwaData?.data ?? [];
  const donghuaList = donghuaData?.data ?? [];
  const continueWatching = recent.filter((item) => item.type === "anime").slice(0, 6);
  const recommendedAnime = [...recent.filter((item) => item.type === "anime")].slice(0, 6);
  const recommendedManga = [...recent.filter((item) => item.type === "manga")].slice(0, 6);

  return <main className="min-h-screen bg-background pb-20"><section className="relative w-full h-[80vh] min-h-[560px] flex items-center justify-center overflow-hidden"><div className="absolute inset-0 z-0"><img src={heroBg} alt="Hero" className="w-full h-full object-cover" decoding="async" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" /></div><div className="container mx-auto px-4 z-10 text-center flex flex-col items-center mt-16"><h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-heading text-white tracking-tight mb-4 text-shadow-neon">ZAIX <span className="text-primary">ANIME</span></h1><p className="text-xl md:text-2xl text-foreground/90 font-medium mb-8 max-w-2xl text-shadow-neon">Stream Anime. Read Manga. Discover Manhwa.</p><div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md"><Button size="lg" className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 shadow-neon font-bold text-lg h-14 px-8" onClick={() => setActiveTab("anime")}>Browse Anime</Button><Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/50 text-white hover:bg-primary/10 hover:text-primary backdrop-blur-sm h-14 px-8" onClick={() => setActiveTab("manga")}>Read Manga</Button></div><div className="mt-6 flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-primary/25 bg-black/40 backdrop-blur-md shadow-neon"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ boxShadow: "0 0 6px #39ff14" }} /><Users className="w-3.5 h-3.5 text-primary" /><span className="text-sm font-bold text-white">{liveUsers.toLocaleString()}</span><span className="text-xs text-muted-foreground font-medium">watching right now</span></div></div></section>{continueWatching.length > 0 && <section className="py-14 container mx-auto px-4"><SectionHeader icon={<History className="w-5 h-5 text-primary" />} title="Continue Watching" subtitle="Pick up where you left off" /><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">{continueWatching.map((item) => <button key={`${item.id}-${item.visitedAt}`} onClick={() => setLocation(`/watch/${item.id}`)} className="text-left group"><div className="rounded-xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-all shadow-lg group-hover:shadow-neon"><div className="aspect-[3/4] bg-secondary relative">{item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" decoding="async" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary/40" /></div>}<div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" /><span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary text-black text-[10px] font-bold shadow-neon">Resume</span></div></div><p className="mt-2 text-sm font-semibold text-white line-clamp-2 group-hover:text-primary">{item.title}</p></button>)}</div></section>}{(recommendedAnime.length > 0 || recommendedManga.length > 0) && <section className="py-10 container mx-auto px-4"><SectionHeader icon={<Sparkles className="w-5 h-5 text-primary" />} title="Recommended for You" subtitle="Based on your recent activity" /><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="text-primary">🎌</span> Anime</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{recommendedAnime.length ? recommendedAnime.map((item) => <button key={item.id} onClick={() => setLocation(`/watch/${item.id}`)} className="text-left group"><div className="rounded-xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-all shadow-lg"><div className="aspect-[3/4] bg-secondary relative">{item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" decoding="async" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary/40" /></div>}</div></div><p className="mt-2 text-xs font-medium text-white line-clamp-2 group-hover:text-primary">{item.title}</p></button>) : <div className="text-sm text-muted-foreground col-span-full">Watch a few anime to get recommendations.</div>}</div></div><div><h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span className="text-primary">📚</span> Manga</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{recommendedManga.length ? recommendedManga.map((item) => <button key={item.id} onClick={() => setLocation(`/manga/${item.id}`)} className="text-left group"><div className="rounded-xl overflow-hidden border border-primary/20 hover:border-primary/60 transition-all shadow-lg"><div className="aspect-[3/4] bg-secondary relative">{item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" decoding="async" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-10 h-10 text-primary/40" /></div>}</div></div><p className="mt-2 text-xs font-medium text-white line-clamp-2 group-hover:text-primary">{item.title}</p></button>) : <div className="text-sm text-muted-foreground col-span-full">Read a few manga to get recommendations.</div>}</div></div></div></section>}{activeTab === "anime" && <><section className="py-16 container mx-auto px-4"><SectionHeader title="🔥 Trending Now" /><div className="flex overflow-x-auto gap-6 pb-8 snap-x -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">{trendingLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-[240px] sm:w-[280px] shrink-0"><Skeleton className="w-full aspect-[3/4] rounded-xl" /></div>) : trendingAnime.map((anime, i) => <div key={`trending-${anime.malId}-${i}`} className="w-[240px] sm:w-[280px] shrink-0 snap-start"><AnimeCard anime={anime} layout="trending" /></div>)}</div></section><section className="py-16 container mx-auto px-4 bg-gradient-to-b from-transparent to-primary/5 rounded-3xl mb-12"><SectionHeader title="✨ New Releases" /><div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">{recentLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />) : recentAnime.map((anime, i) => <AnimeCard key={`recent-${anime.malId}-${i}`} anime={{ ...anime, isNew: true }} layout="new" />)}</div></section></>}{activeTab === "manga" && <section className="py-16 container mx-auto px-4"><SectionHeader title="📚 Popular Manga" subtitle="Top Japanese comics from MangaDex" />{mangaError ? <MangaError message="Failed to load manga from MangaDex. The service may be temporarily unavailable." /> : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">{mangaLoading ? Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />) : mangaList.map((m: any, i: number) => <MangaCard key={m.id} manga={m} isHot={i < 3} isNew={i >= 3 && i < 6} />)}</div>}</section>}{activeTab === "manhwa" && <section className="py-16 container mx-auto px-4"><SectionHeader title="🇰🇷 Popular Manhwa" subtitle="Top Korean comics from MangaDex" />{manhwaError ? <MangaError message="Failed to load manhwa from MangaDex. The service may be temporarily unavailable." /> : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">{manhwaLoading ? Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="w-full aspect-[3/4] rounded-xl" />) : manhwaList.map((m: any, i: number) => <MangaCard key={m.id} manga={m} isHot={i < 3} isNew={i >= 3 && i < 6} />)}</div>}</section>}{activeTab === "donghua" && <section className="py-16 container mx-auto px-4"><SectionHeader title="🐉 Donghua" subtitle="Chinese animation — streamed like anime" />{donghuaError ? <MangaError message="Failed to load Donghua from the anime database. Please try again." /> : <div className="flex overflow-x-auto gap-6 pb-8 snap-x -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">{donghuaLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-[240px] sm:w-[280px] shrink-0"><Skeleton className="w-full aspect-[3/4] rounded-xl" /></div>) : donghuaList.map((anime: any, i: number) => <div key={`donghua-${anime.malId}-${i}`} className="w-[240px] sm:w-[280px] shrink-0 snap-start"><AnimeCard anime={anime} layout="trending" /></div>)}</div>}</section>}</main>;
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: React.ReactNode }) {
  return <div className="flex flex-col gap-1 mb-8"><div className="flex items-center gap-3">{icon}<h2 className="text-2xl sm:text-3xl font-bold font-heading text-white">{title}</h2><div className="h-px bg-primary/50 flex-1 shadow-neon mt-1" /></div>{subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}</div>;
}

function MangaError({ message }: { message: string }) {
  return <div className="flex flex-col items-center py-16 gap-4 text-center"><div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><span className="text-3xl">⚠️</span></div><p className="text-white font-bold">Service Unavailable</p><p className="text-muted-foreground text-sm max-w-md">{message}</p><Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => window.location.reload()}>Retry</Button></div>;
}
