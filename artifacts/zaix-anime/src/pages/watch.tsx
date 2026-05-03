import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  Share2, Heart, MessageSquare, Star, Send, Play, Tv,
  AlertCircle, RefreshCw, Film, PictureInPicture2, WandSparkles,
  Download, Check, X, Server, ChevronDown, Layers, SkipForward,
  AlertTriangle, Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ReviewSection } from "@/components/review-section";
import { WatchlistButton } from "@/components/watchlist-button";
import { useRecentlyVisited } from "@/hooks/use-local-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AdminCrown } from "@/components/admin-badge";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetAnimeById,
  useGetAnimeEpisodes,
  getGetAnimeByIdQueryKey,
  getGetAnimeEpisodesQueryKey,
} from "@workspace/api-client-react";

interface StreamProvider { name: string; label: string; url: string; }
interface StreamData {
  malId: number; episode: number; season: number;
  imdbId: string | null; embedUrl: string; providers: StreamProvider[];
}

interface SeasonEntry {
  malId: number; title: string; image: string | null; relation: string; isCurrent: boolean;
}

type LangFilter = "sub" | "dub" | "hindi" | "raw";

const LANG_OPTIONS: { key: LangFilter; label: string; color: string }[] = [
  { key: "sub", label: "Sub", color: "text-primary border-primary/40" },
  { key: "dub", label: "Eng Dub", color: "text-blue-400 border-blue-400/40" },
  { key: "hindi", label: "Hindi Dub", color: "text-orange-400 border-orange-400/40" },
  { key: "raw", label: "Raw", color: "text-muted-foreground border-border" },
];

const EXTRA_SERVERS = [
  { name: "vidstreaming", label: "Vidstreaming" },
  { name: "gogo", label: "GogoAnime" },
  { name: "cloud", label: "CloudStream" },
  { name: "zoro", label: "Zoro" },
];

const FAILOVER_DELAY = 15;

function DownloadModal({ anime, episode, onClose }: { anime: any; episode: number; onClose: () => void }) {
  const [quality, setQuality] = useState<"1080p" | "720p" | "480p">("1080p");
  const [format, setFormat] = useState<"mp4" | "mkv">("mp4");
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const startDownload = () => {
    setDownloading(true);
    setTimeout(() => { setDownloading(false); setDone(true); toast.success("Download queued!", { description: `${anime?.title} EP ${episode} — ${quality} ${format.toUpperCase()}` }); }, 1500);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-black border border-primary/30 rounded-2xl shadow-neon-intense p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold font-heading text-white flex items-center gap-2"><Download className="w-4 h-4 text-primary" /> Download Episode</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="bg-secondary/50 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Anime</p>
          <p className="text-sm font-bold text-white line-clamp-1">{anime?.title || "Unknown"}</p>
          <p className="text-xs text-primary mt-0.5">Episode {episode}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Quality</p>
          <div className="flex gap-2">
            {(["1080p", "720p", "480p"] as const).map((q) => (
              <button key={q} onClick={() => setQuality(q)} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${quality === q ? "bg-primary text-black border-primary shadow-neon" : "bg-secondary border-border text-muted-foreground hover:border-primary/50 hover:text-primary"}`}>{q}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">Format</p>
          <div className="flex gap-2">
            {(["mp4", "mkv"] as const).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`flex-1 py-2 rounded-lg text-sm font-bold border uppercase transition-all ${format === f ? "bg-primary text-black border-primary shadow-neon" : "bg-secondary border-border text-muted-foreground hover:border-primary/50 hover:text-primary"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 border border-border">
          <p className="text-primary font-semibold mb-1">High-Speed Download</p>
          <p>Multi-threaded • Resumable • {quality === "1080p" ? "~800MB" : quality === "720p" ? "~400MB" : "~200MB"} est.</p>
        </div>
        <Button className={`w-full font-bold shadow-neon transition-all ${done ? "bg-green-600 hover:bg-green-600" : "bg-primary text-black hover:bg-primary/90"}`} onClick={done ? onClose : startDownload} disabled={downloading}>
          {downloading ? (<><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" /> Queuing...</>) : done ? (<><Check className="w-4 h-4 mr-2" /> Added to Queue!</>) : (<><Download className="w-4 h-4 mr-2" /> Download {quality}</>)}
        </Button>
      </div>
    </div>
  );
}

function SeasonTabs({ malId, seasons, onSelect }: { malId: number; seasons: SeasonEntry[]; onSelect: (id: number) => void }) {
  if (seasons.length <= 1) return null;
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 font-semibold uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-primary" /><span>Seasons</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 flex-1 hide-scrollbar" style={{ scrollbarWidth: "none" }}>
        {seasons.map((s, i) => (
          <button key={s.malId} onClick={() => onSelect(s.malId)} title={s.title}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${s.malId === malId ? "bg-primary text-black border-primary shadow-neon" : "bg-card border-primary/20 text-muted-foreground hover:border-primary/60 hover:text-primary"}`}>
            {s.relation === "Sequel" || s.relation === "Prequel" || s.relation === "Side story" || s.relation === "Spin-off" ? `${s.relation} ${i + 1}` : `Season ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function EpisodeListHeader({ episodes }: { episodes: any[] }) {
  return (
    <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex justify-between items-center">
      <span>Episodes</span>
      <Badge variant="secondary" className="bg-primary/10 text-primary">{episodes.length}</Badge>
    </h3>
  );
}

interface EpisodeListProps { episodes: any[]; loading: boolean; selectedEp: number; onSelect: (n: number) => void; maxHeight: string; }
function EpisodeList({ episodes, loading, selectedEp, onSelect, maxHeight }: EpisodeListProps) {
  if (loading) return <div className="space-y-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (!episodes.length) return <p className="text-muted-foreground text-sm text-center py-4">No episodes found.</p>;
  return (
    <div className="overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2" style={{ maxHeight }}>
      {episodes.map((ep) => (
        <button key={ep.number} data-testid={`ep-btn-${ep.number}`} onClick={() => onSelect(ep.number)}
          className={`flex gap-3 items-center text-left p-2.5 rounded-lg transition-all border w-full ${selectedEp === ep.number ? "bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] text-primary" : "bg-secondary/30 border-transparent hover:bg-secondary hover:border-primary/30 text-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-xs ${selectedEp === ep.number ? "bg-primary text-black" : "bg-black/50 text-muted-foreground"}`}>{ep.number}</div>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <h4 className="text-sm font-medium line-clamp-1" title={ep.title || `Episode ${ep.number}`}>{ep.title || `Episode ${ep.number}`}</h4>
            {ep.aired && <p className="text-xs opacity-60 line-clamp-1">{new Date(ep.aired).toLocaleDateString()}</p>}
          </div>
          {ep.filler && <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/10 px-1 py-0 shrink-0">FILLER</Badge>}
        </button>
      ))}
    </div>
  );
}

interface ChatMessage { id: number; user: string; text: string; color: string; isAdmin?: boolean; }
function LiveChat({ chatMsg, setChatMsg, isAdmin }: { chatMsg: string; setChatMsg: (v: string) => void; isAdmin: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, user: "AnimeFan99", text: "THIS ANIMATION IS INSANE 🔥", color: "text-primary" },
    { id: 2, user: "KiraKun", text: "Best episode so far imo", color: "text-blue-400" },
    { id: 3, user: "SakuraChan", text: "I can't wait for the next arc!!", color: "text-pink-400" },
    { id: 4, user: "WeebMaster", text: "the OP song goes incredibly hard", color: "text-yellow-400" },
    { id: 5, user: "NarutoBro", text: "best anime ever made no debate", color: "text-green-400" },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  function send() {
    if (!chatMsg.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), user: isAdmin ? "zaix" : "You", text: chatMsg.trim(), color: isAdmin ? "text-yellow-400" : "text-primary", isAdmin }]);
    setChatMsg("");
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <>
      <div className="h-[240px] sm:h-[280px] flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-2 mb-4 text-sm">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg px-2.5 py-1.5"
            style={m.isAdmin ? { background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.35)", boxShadow: "0 0 8px rgba(255,215,0,0.12)" } : {}}>
            <span className={`font-bold ${m.color} flex items-center gap-1.5 inline-flex`}>
              {m.isAdmin && <AdminCrown size="xs" />}{m.user}:
            </span>{" "}
            <span className={m.isAdmin ? "font-medium text-yellow-50" : "font-normal text-white"}>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="relative">
        <input type="text" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={isAdmin ? "Send as zaix (admin)..." : "Say something..."}
          className="w-full bg-secondary border rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none text-white transition-colors"
          style={isAdmin ? { borderColor: "rgba(255,215,0,0.4)", boxShadow: "0 0 6px rgba(255,215,0,0.1)" } : { borderColor: "" }} />
        <button onClick={send} className="absolute right-1 top-1/2 -translate-y-1/2 text-primary p-1.5 hover:bg-primary/10 rounded-full transition-colors"><Send className="w-4 h-4" /></button>
      </div>
    </>
  );
}

function saveProgressToDb(contentId: string, episode: number) {
  const token = localStorage.getItem("zaix_token");
  if (!token) return;
  fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contentType: "anime", contentId, episode, progressSeconds: 0, totalSeconds: 0 }),
  }).catch(() => { });
}

function saveToWatchlistDb(contentId: string, contentTitle: string, contentImage: string | null, contentGenres: string) {
  const token = localStorage.getItem("zaix_token");
  if (!token) return;
  fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ contentType: "anime", contentId, contentTitle, contentImage, contentGenres, status: "watching" }),
  }).catch(() => { });
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const malId = parseInt(id || "0");
  const { authenticated: isAdmin } = useAdmin();
  const { user } = useAuth();
  const [selectedEp, setSelectedEp] = useState<number>(1);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>("");
  const [activeServer, setActiveServer] = useState<string>("vidstreaming");
  const [langFilter, setLangFilter] = useState<LangFilter>("sub");
  const [chatMsg, setChatMsg] = useState("");
  const [pipMode, setPipMode] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [showDownload, setShowDownload] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    try { return JSON.parse(localStorage.getItem("zaix_autoplay") ?? "false"); } catch { return false; }
  });
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null);
  const [failoverCountdown, setFailoverCountdown] = useState<number | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failoverTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failoverCancelledRef = useRef(false);
  const activeProviderRef = useRef(activeProvider);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { addRecent } = useRecentlyVisited();

  useEffect(() => { activeProviderRef.current = activeProvider; }, [activeProvider]);

  const { data: anime, isLoading: animeLoading } = useGetAnimeById(malId, {
    query: { enabled: malId > 0, queryKey: getGetAnimeByIdQueryKey(malId) },
  });
  const { data: episodesData, isLoading: epsLoading } = useGetAnimeEpisodes(malId, {}, {
    query: { enabled: malId > 0, queryKey: getGetAnimeEpisodesQueryKey(malId, {}) },
  });
  const episodes = episodesData?.data ?? [];

  const { data: seasonsData } = useQuery({
    queryKey: ["anime-seasons", malId],
    queryFn: async () => {
      const res = await fetch(`/api/anime/${malId}/seasons`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: malId > 0,
    staleTime: 30 * 60 * 1000,
  });
  const seasons: SeasonEntry[] = seasonsData?.data ?? [];

  useEffect(() => {
    if (anime && malId > 0) {
      addRecent({ id: String(malId), type: "anime", title: anime.title, image: anime.image ?? null });
    }
  }, [anime, malId, addRecent]);

  useEffect(() => {
    if (!anime) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(anime.title + " trailer")}&limit=1`);
        if (!res.ok) return;
        const data = await res.json();
        const yt = data?.data?.[0]?.trailerUrl || data?.data?.[0]?.trailer?.url || data?.data?.[0]?.trailer?.embedUrl || null;
        if (yt) setTrailerUrl(yt);
      } catch { }
    }, 400);
    return () => clearTimeout(t);
  }, [anime]);

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current) { clearInterval(autoPlayTimerRef.current); autoPlayTimerRef.current = null; }
    setAutoPlayCountdown(null);
  }, []);

  const clearFailoverTimer = useCallback(() => {
    if (failoverTimerRef.current) { clearInterval(failoverTimerRef.current); failoverTimerRef.current = null; }
    setFailoverCountdown(null);
    failoverCancelledRef.current = false;
  }, []);

  const startFailoverTimer = useCallback((providers: StreamProvider[]) => {
    clearFailoverTimer();
    if (providers.length <= 1) return;
    failoverCancelledRef.current = false;
    let count = FAILOVER_DELAY;
    setFailoverCountdown(count);
    failoverTimerRef.current = setInterval(() => {
      count--;
      setFailoverCountdown(count);
      if (count <= 0) {
        clearInterval(failoverTimerRef.current!);
        failoverTimerRef.current = null;
        setFailoverCountdown(null);
        if (!failoverCancelledRef.current) {
          const currentIdx = providers.findIndex(p => p.name === activeProviderRef.current);
          const nextIdx = (currentIdx + 1) % providers.length;
          const nextProv = providers[nextIdx];
          setActiveProvider(nextProv.name);
          toast.info(`Switched to ${nextProv.label}`, {
            description: "Auto-switched to backup server",
            icon: <Zap className="w-4 h-4 text-primary" />,
          });
        }
      }
    }, 1000);
  }, [clearFailoverTimer]);

  const cancelFailover = useCallback(() => {
    failoverCancelledRef.current = true;
    clearFailoverTimer();
    toast.success("Auto-switch cancelled");
  }, [clearFailoverTimer]);

  const switchNow = useCallback((providers: StreamProvider[]) => {
    clearFailoverTimer();
    const currentIdx = providers.findIndex(p => p.name === activeProviderRef.current);
    const nextIdx = (currentIdx + 1) % providers.length;
    const nextProv = providers[nextIdx];
    setActiveProvider(nextProv.name);
    toast.success(`Switched to ${nextProv.label}`, { icon: <Zap className="w-4 h-4 text-primary" /> });
  }, [clearFailoverTimer]);

  const startAutoPlayCountdown = useCallback((nextEp: number, fetchStreamFn: (ep: number) => void) => {
    clearAutoPlayTimer();
    setAutoPlayCountdown(15);
    autoPlayTimerRef.current = setInterval(() => {
      setAutoPlayCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(autoPlayTimerRef.current!);
          autoPlayTimerRef.current = null;
          setAutoPlayCountdown(null);
          setSelectedEp(nextEp);
          fetchStreamFn(nextEp);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearAutoPlayTimer]);

  useEffect(() => { return () => { clearAutoPlayTimer(); clearFailoverTimer(); }; }, [clearAutoPlayTimer, clearFailoverTimer]);

  const fetchStream = useCallback(async (epNumber: number) => {
    setStreamLoading(true);
    setStreamError(null);
    clearAutoPlayTimer();
    clearFailoverTimer();
    try {
      const res = await fetch(`/api/anime/stream?malId=${malId}&episode=${epNumber}&season=1`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load stream" }));
        throw new Error(err.error || "Failed to load stream");
      }
      const data: StreamData = await res.json();
      setStreamData(data);
      if (data.providers?.length > 0) {
        setActiveProvider(data.providers[0].name);
        startFailoverTimer(data.providers);
      }
      if (autoPlay) {
        const nextEpNumber = epNumber + 1;
        const hasNext = episodes.some(e => e.number === nextEpNumber);
        if (hasNext) startAutoPlayCountdown(nextEpNumber, fetchStream);
      }
    } catch (err: any) {
      setStreamError(err.message || "Could not load video stream");
    } finally {
      setStreamLoading(false);
    }
  }, [malId, autoPlay, episodes, clearAutoPlayTimer, clearFailoverTimer, startAutoPlayCountdown, startFailoverTimer]);

  const handleEpisodeClick = (epNumber: number) => {
    setSelectedEp(epNumber);
    fetchStream(epNumber);
    // Save progress to DB
    saveProgressToDb(String(malId), epNumber);
    // Save to watchlist as "watching"
    if (user && anime) {
      saveToWatchlistDb(
        String(malId),
        anime.title,
        anime.image ?? null,
        (anime.genres as string[]).join(",")
      );
    }
  };

  const handleProviderClick = (providerName: string) => {
    setActiveProvider(providerName);
    setActiveServer(providerName);
    clearFailoverTimer();
    if (streamData?.providers) startFailoverTimer(streamData.providers);
  };

  const handleSeasonSelect = (seasonMalId: number) => {
    if (seasonMalId !== malId) setLocation(`/watch/${seasonMalId}`);
  };

  const toggleAutoPlay = () => {
    const next = !autoPlay;
    setAutoPlay(next);
    try { localStorage.setItem("zaix_autoplay", JSON.stringify(next)); } catch { }
    if (!next) clearAutoPlayTimer();
    toast.success(next ? "Auto-Play enabled" : "Auto-Play disabled");
  };

  const currentProvider = streamData?.providers?.find(p => p.name === activeProvider) ?? streamData?.providers?.[0] ?? null;
  const currentEmbedUrl = currentProvider?.url ?? null;
  const directLink = typeof window !== "undefined" ? `${window.location.origin}/watch/${malId}` : `/watch/${malId}`;
  const nextEpNumber = selectedEp + 1;
  const hasNextEp = episodes.some(e => e.number === nextEpNumber);

  const share = async () => {
    try { await navigator.clipboard.writeText(directLink); toast.success("Link copied!", { duration: 1500 }); } catch { }
  };

  const startPip = async () => {
    try {
      const el = iframeRef.current as any;
      if (el?.requestPictureInPicture) { await el.requestPictureInPicture(); setPipMode(true); }
    } catch { }
  };

  return (
    <>
      {showDownload && <DownloadModal anime={anime} episode={selectedEp} onClose={() => setShowDownload(false)} />}

      <div className="min-h-screen bg-background pt-16 pb-20">
        <div className="container mx-auto px-4 max-w-7xl mt-6">
          <SeasonTabs malId={malId} seasons={seasons} onSelect={handleSeasonSelect} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: player + info */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* Video Player */}
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon" style={{ transform: "translateZ(0)" }}>
                {streamLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-primary font-medium animate-pulse">Loading stream...</p>
                  </div>
                )}
                {!streamLoading && streamError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                    <p className="text-white font-bold text-lg mb-1">Stream Unavailable</p>
                    <p className="text-muted-foreground text-sm mb-4">{streamError}</p>
                    <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => fetchStream(selectedEp)}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Retry
                    </Button>
                  </div>
                )}
                {!streamLoading && !streamError && currentEmbedUrl && (
                  <iframe ref={iframeRef} key={currentEmbedUrl} src={currentEmbedUrl} className="w-full h-full"
                    allowFullScreen allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="no-referrer-when-downgrade"
                    title={`${anime?.title || "Anime"} Episode ${selectedEp}`} />
                )}
                {!streamLoading && !streamError && !currentEmbedUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {anime?.image && <img src={anime.image} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50 flex flex-col items-center justify-center gap-4 z-10 p-6 text-center">
                      <Play className="w-16 h-16 text-primary/60 mb-2" />
                      <h2 className="text-2xl font-bold text-white font-heading">Ready to watch?</h2>
                      <p className="text-muted-foreground max-w-md text-sm">
                        {episodes.length > 0 ? "Click an episode from the list to start streaming." : "Episode list is loading..."}
                      </p>
                      {episodes.length > 0 && (
                        <Button className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold mt-2" onClick={() => handleEpisodeClick(episodes[0].number)}>
                          <Play className="w-4 h-4 mr-2" /> Watch Episode 1
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-play countdown */}
                {autoPlayCountdown !== null && hasNextEp && !streamLoading && (
                  <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 bg-black/80 backdrop-blur-md border border-primary/30 rounded-xl px-4 py-3 shadow-neon">
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-semibold">Next Episode in</span>
                      <span className="text-primary font-black text-2xl leading-tight">{autoPlayCountdown}s</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => { clearAutoPlayTimer(); fetchStream(nextEpNumber); setSelectedEp(nextEpNumber); }}
                        className="px-3 py-1 rounded-lg bg-primary text-black text-xs font-bold hover:bg-primary/90 flex items-center gap-1">
                        <SkipForward className="w-3 h-3" /> Play Now
                      </button>
                      <button onClick={clearAutoPlayTimer} className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-semibold hover:text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Auto-failover overlay */}
                {failoverCountdown !== null && currentEmbedUrl && !streamLoading && streamData && streamData.providers.length > 1 && (
                  <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-black/85 backdrop-blur-md border border-yellow-500/40 rounded-xl px-4 py-3 shadow-[0_0_20px_rgba(255,200,0,0.15)]">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-white text-xs font-semibold">Stream not loading?</span>
                      <span className="text-yellow-400 font-black text-base leading-tight">Backup in {failoverCountdown}s</span>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-1">
                      <button onClick={() => switchNow(streamData.providers)}
                        className="px-3 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 text-xs font-bold border border-yellow-500/30 hover:bg-yellow-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Switch Now
                      </button>
                      <button onClick={cancelFailover} className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground text-xs hover:text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Server Switcher */}
              <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold text-white">Streaming Servers</span>
                    <span className="text-xs text-muted-foreground ml-1">— switch if one doesn't load</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Auto-Play</span>
                    <button onClick={toggleAutoPlay} role="switch" aria-checked={autoPlay}
                      className="relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none"
                      style={{ background: autoPlay ? "#39ff14" : "#333" }}>
                      <span className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                        style={{ transform: autoPlay ? "translateX(22px)" : "translateX(3px)" }} />
                    </button>
                    {autoPlay && hasNextEp && <span className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded-full">ON</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXTRA_SERVERS.map((srv) => (
                    <button key={srv.name} onClick={() => handleProviderClick(srv.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${activeServer === srv.name ? "bg-primary text-black border-primary shadow-neon" : "bg-secondary/40 text-muted-foreground border-border hover:border-primary/50 hover:text-primary"}`}>
                      {srv.label}
                    </button>
                  ))}
                  {streamData?.providers?.filter(p => !EXTRA_SERVERS.find(s => s.name === p.name)).map((provider) => (
                    <button key={provider.name} onClick={() => handleProviderClick(provider.name)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${activeProvider === provider.name ? "bg-primary text-black border-primary shadow-neon" : "bg-secondary/40 text-muted-foreground border-border hover:border-primary/50 hover:text-primary"}`}>
                      {provider.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                  <Tv className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Language:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {LANG_OPTIONS.map((opt) => (
                      <button key={opt.key} onClick={() => setLangFilter(opt.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${langFilter === opt.key ? `bg-primary/10 ${opt.color} border-current shadow-neon` : "bg-transparent border-border text-muted-foreground hover:text-white hover:border-white/30"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2 -mt-1">
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={share}>
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => setLocation("/watch-party")}>
                  <Film className="w-4 h-4 mr-2" /> Watch Party
                </Button>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={startPip} disabled={!currentEmbedUrl}>
                  <PictureInPicture2 className="w-4 h-4 mr-2" /> {pipMode ? "PiP Active" : "PiP"}
                </Button>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowDownload(true)}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                {hasNextEp && streamData && (
                  <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={() => { setSelectedEp(nextEpNumber); fetchStream(nextEpNumber); }}>
                    <SkipForward className="w-4 h-4 mr-2" /> Next Episode
                  </Button>
                )}
              </div>

              {/* Anime Info */}
              <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden"
                style={anime?.image ? { boxShadow: "0 0 40px rgba(57,255,20,.08)" } : undefined}>
                {anime?.image && (
                  <div className="absolute inset-0 z-0 opacity-5 pointer-events-none">
                    <img src={anime.image} alt="" className="w-full h-full object-cover blur-3xl scale-150" />
                  </div>
                )}
                <div className="relative z-10">
                  {animeLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-3/4" />
                      <Skeleton className="h-6 w-1/4" />
                      <div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div>
                      <Skeleton className="h-32 w-full mt-4" />
                    </div>
                  ) : anime ? (
                    <>
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2">{anime.title}</h1>
                          {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                            <p className="text-muted-foreground text-sm mb-2">{anime.titleEnglish}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <p className="text-primary font-medium">{streamData ? `Episode ${selectedEp}` : "Select Episode"}</p>
                            <span className="text-muted-foreground text-xs">•</span>
                            <span className="text-muted-foreground text-sm">{anime.status}</span>
                            {anime.aired && <><span className="text-muted-foreground text-xs">•</span><span className="text-muted-foreground text-sm">{anime.aired}</span></>}
                            {anime.studios && (anime.studios as string[]).length > 0 && (
                              <><span className="text-muted-foreground text-xs">•</span><span className="text-muted-foreground text-sm">{(anime.studios as string[]).join(", ")}</span></>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-secondary/50 text-foreground border-border text-sm px-3 py-1">
                            <Star className="w-4 h-4 mr-1.5 text-primary fill-primary" /> {anime.score?.toFixed(1) || "N/A"}
                          </Badge>
                          <div className="flex gap-2 items-center">
                            <WatchlistButton
                              contentType="anime"
                              contentId={String(malId)}
                              contentTitle={anime.title}
                              contentImage={anime.image ?? null}
                              contentGenres={(anime.genres as string[]).join(",")}
                              size="md"
                            />
                            <Button variant="outline" size="icon" className="border-border hover:border-primary hover:text-primary bg-secondary/50" onClick={share}>
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {(anime.genres as string[]).map((g: string) => (
                          <Badge key={g} variant="outline" className="border-primary/30 text-primary/80 bg-primary/5">{g}</Badge>
                        ))}
                        {anime.type && <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">{anime.type}</Badge>}
                      </div>

                      <div className="mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base border-t border-border pt-4">
                        <p>{anime.synopsis || "No synopsis available."}</p>
                      </div>

                      {trailerUrl && (
                        <Button variant="outline" className="mt-2 border-primary/30 text-primary hover:bg-primary/10 w-fit" onClick={() => setShowTrailer((v) => !v)}>
                          <WandSparkles className="w-4 h-4 mr-2" /> {showTrailer ? "Hide Trailer" : "Watch Trailer"}
                        </Button>
                      )}
                      {showTrailer && trailerUrl && (
                        <iframe className="mt-2 w-full aspect-video rounded-xl border border-primary/20" src={trailerUrl} allowFullScreen title="Trailer" />
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Failed to load anime details.</p>
                  )}
                </div>
              </div>

              {/* Mobile episode list */}
              <div className="lg:hidden bg-card border border-border rounded-xl p-5">
                <EpisodeListHeader episodes={episodes} />
                <EpisodeList episodes={episodes} loading={epsLoading} selectedEp={selectedEp} onSelect={handleEpisodeClick} maxHeight="300px" />
              </div>

              {malId > 0 && <ReviewSection contentType="anime" contentId={String(malId)} title={anime?.title} />}
            </div>

            {/* Right sidebar */}
            <div className="flex flex-col gap-6">
              <div className="hidden lg:block bg-card border border-border rounded-xl p-5 shadow-lg">
                <EpisodeListHeader episodes={episodes} />
                <EpisodeList episodes={episodes} loading={epsLoading} selectedEp={selectedEp} onSelect={handleEpisodeClick} maxHeight="500px" />
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-lg lg:sticky lg:top-24">
                <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Live Chat
                </h3>
                <LiveChat chatMsg={chatMsg} setChatMsg={setChatMsg} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
