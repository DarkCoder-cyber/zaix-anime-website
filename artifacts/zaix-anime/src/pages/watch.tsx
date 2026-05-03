import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Share2, Heart, MessageSquare, Star, Send, Play, Tv, AlertCircle, RefreshCw } from "lucide-react";
import { ReviewSection } from "@/components/review-section";
import { useRecentlyVisited } from "@/hooks/use-local-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAnimeById, useGetAnimeEpisodes, getGetAnimeByIdQueryKey, getGetAnimeEpisodesQueryKey } from "@workspace/api-client-react";

interface StreamProvider {
  name: string;
  label: string;
  url: string;
}

interface StreamData {
  malId: number;
  episode: number;
  season: number;
  imdbId: string | null;
  embedUrl: string;
  providers: StreamProvider[];
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const malId = parseInt(id || "0");
  const [selectedEp, setSelectedEp] = useState<number>(1);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMsg, setChatMsg] = useState("");
  const { addRecent } = useRecentlyVisited();

  const { data: anime, isLoading: animeLoading } = useGetAnimeById(malId, {
    query: { enabled: malId > 0, queryKey: getGetAnimeByIdQueryKey(malId) },
  });
  const { data: episodesData, isLoading: epsLoading } = useGetAnimeEpisodes(malId, {}, {
    query: { enabled: malId > 0, queryKey: getGetAnimeEpisodesQueryKey(malId, {}) },
  });

  const episodes = episodesData?.data ?? [];

  useEffect(() => {
    if (anime && malId > 0) {
      addRecent({ id: String(malId), type: "anime", title: anime.title, image: anime.image ?? null });
    }
  }, [anime, malId, addRecent]);

  useEffect(() => {
    if (!anime || !episodes.length || streamLoading) return;
    const timer = setTimeout(() => {
      const video = document.querySelector("iframe");
      const handle = () => {
        const next = episodes.find((e) => e.number > selectedEp);
        if (next) handleEpisodeClick(next.number);
      };
      if (video) {
        const observer = new MutationObserver(() => {});
        observer.disconnect();
        handle();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [anime, episodes.length, selectedEp, streamLoading]);

  const fetchStream = async (epNumber: number) => {
    setStreamLoading(true);
    setStreamError(null);
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
      }
    } catch (err: any) {
      setStreamError(err.message || "Could not load video stream");
    } finally {
      setStreamLoading(false);
    }
  };

  const handleEpisodeClick = (epNumber: number) => {
    setSelectedEp(epNumber);
    fetchStream(epNumber);
  };

  const currentProvider = streamData?.providers?.find(p => p.name === activeProvider) ?? streamData?.providers?.[0] ?? null;
  const currentEmbedUrl = currentProvider?.url ?? null;
  const nextEpisode = episodes.find((e) => e.number > selectedEp);
  const handlePlayerEnded = () => {
    if (nextEpisode) handleEpisodeClick(nextEpisode.number);
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="container mx-auto px-4 max-w-7xl mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon">
              {streamLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" /><p className="text-primary font-medium animate-pulse">Loading stream...</p></div>}
              {!streamLoading && streamError && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-10 p-6 text-center"><AlertCircle className="w-12 h-12 text-red-400 mb-3" /><p className="text-white font-bold text-lg mb-1">Stream Unavailable</p><p className="text-muted-foreground text-sm mb-4">{streamError}</p><Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10" onClick={() => fetchStream(selectedEp)}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button></div>}
              {!streamLoading && !streamError && currentEmbedUrl && (
                <iframe key={currentEmbedUrl} src={currentEmbedUrl} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="no-referrer-when-downgrade" title={`${anime?.title || "Anime"} Episode ${selectedEp}`} onLoad={() => { const video = document.querySelector("iframe"); if (video) setTimeout(handlePlayerEnded, 1); }} />
              )}
              {!streamLoading && !streamError && !currentEmbedUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {anime?.image && <img src={anime.image} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50 flex flex-col items-center justify-center gap-4 z-10 p-6 text-center">
                    <Play className="w-16 h-16 text-primary/60 mb-2" />
                    <h2 className="text-2xl font-bold text-white font-heading">Ready to watch?</h2>
                    <p className="text-muted-foreground max-w-md text-sm">{episodes.length > 0 ? "Click an episode from the list to start streaming." : "Episode list is loading..."}</p>
                    {episodes.length > 0 && <Button className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold mt-2" onClick={() => handleEpisodeClick(episodes[0].number)}><Play className="w-4 h-4 mr-2" /> Watch Episode 1</Button>}
                  </div>
                </div>
              )}
            </div>

            {streamData && !streamLoading && !streamError && streamData.providers?.length > 0 && <div className="flex flex-col gap-3 bg-card border border-border rounded-xl px-4 py-3 -mt-2"><div className="flex items-center gap-2"><Tv className="w-4 h-4 text-primary shrink-0" /><span className="text-sm text-muted-foreground">Streaming source — if one doesn't load, try another:</span></div><div className="flex flex-wrap gap-2">{streamData.providers.map((provider) => <button key={provider.name} onClick={() => setActiveProvider(provider.name)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${activeProvider === provider.name ? "bg-primary text-black border-primary shadow-neon" : "bg-secondary/40 text-muted-foreground border-border hover:border-primary/50 hover:text-primary"}`}>{provider.label}</button>)}</div></div>}

            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden">
              {anime?.image && <div className="absolute inset-0 z-0 opacity-5 pointer-events-none"><img src={anime.image} alt="" className="w-full h-full object-cover blur-3xl scale-150" /></div>}
              <div className="relative z-10">
                {animeLoading ? <div className="space-y-4"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-6 w-1/4" /><div className="flex gap-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-16 rounded-full" /></div><Skeleton className="h-32 w-full mt-4" /></div> : anime ? <>
                  <div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2">{anime.title}</h1>{anime.titleEnglish && anime.titleEnglish !== anime.title && <p className="text-muted-foreground text-sm mb-2">{anime.titleEnglish}</p>}<div className="flex items-center gap-3 mt-1 flex-wrap"><p className="text-primary font-medium">{streamData ? `Episode ${selectedEp}` : "Select Episode"}</p><span className="text-muted-foreground text-xs">•</span><span className="text-muted-foreground text-sm">{anime.status}</span>{anime.aired && <><span className="text-muted-foreground text-xs">•</span><span className="text-muted-foreground text-sm">{anime.aired}</span></>}{anime.studios && anime.studios.length > 0 && <><span className="text-muted-foreground text-xs">•</span><span className="text-muted-foreground text-sm">{(anime.studios as string[]).join(", ")}</span></>}</div></div><div className="flex items-center gap-3"><Badge variant="secondary" className="bg-secondary/50 text-foreground border-border text-sm px-3 py-1"><Star className="w-4 h-4 mr-1.5 text-primary fill-primary" /> {anime.score?.toFixed(1) || "N/A"}</Badge><div className="flex gap-2"><Button variant="outline" size="icon" className="border-border hover:border-primary hover:text-primary bg-secondary/50"><Heart className="w-4 h-4" /></Button><Button variant="outline" size="icon" className="border-border hover:border-primary hover:text-primary bg-secondary/50"><Share2 className="w-4 h-4" /></Button></div></div></div><div className="flex flex-wrap gap-2 mt-2">{(anime.genres as string[]).map((g: string) => <Badge key={g} variant="outline" className="border-primary/30 text-primary/80 bg-primary/5">{g}</Badge>)}{anime.type && <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">{anime.type}</Badge>}</div><div className="mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base border-t border-border pt-4"><p>{anime.synopsis || "No synopsis available."}</p></div></> : <p className="text-muted-foreground">Failed to load anime details.</p>}
              </div>
            </div>

            <div className="lg:hidden bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4">Episodes</h3>
              <EpisodeList episodes={episodes} loading={epsLoading} selectedEp={selectedEp} onSelect={handleEpisodeClick} maxHeight="300px" />
            </div>

            {malId > 0 && <ReviewSection contentType="anime" contentId={String(malId)} title={anime?.title} />}
          </div>

          <div className="flex flex-col gap-6">
            <div className="hidden lg:block bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex justify-between items-center"><span>Episodes</span><Badge variant="secondary" className="bg-primary/10 text-primary">{episodes.length}</Badge></h3>
              <EpisodeList episodes={episodes} loading={epsLoading} selectedEp={selectedEp} onSelect={handleEpisodeClick} maxHeight="500px" />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 shadow-lg lg:sticky lg:top-24">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Live Chat</h3>
              <div className="h-[240px] sm:h-[280px] flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 mb-4 text-sm">
                <div className="text-primary font-bold">AnimeFan99: THIS ANIMATION IS INSANE 🔥</div>
                <div className="text-blue-400 font-bold">KiraKun: Best episode so far imo</div>
                <div className="text-pink-400 font-bold">SakuraChan: I can't wait for the next arc!!</div>
                <div className="text-yellow-400 font-bold">WeebMaster: the OP song goes incredibly hard</div>
                <div className="text-green-400 font-bold">NarutoBro: best anime ever made no debate</div>
                <div ref={chatEndRef} />
              </div>
              <div className="relative">
                <input type="text" value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder="Say something..." className="w-full bg-secondary border border-border rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary/50 text-white" />
                <button onClick={() => setChatMsg("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-primary p-1.5 hover:bg-primary/10 rounded-full transition-colors"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EpisodeListProps {
  episodes: any[];
  loading: boolean;
  selectedEp: number;
  onSelect: (n: number) => void;
  maxHeight: string;
}

function EpisodeList({ episodes, loading, selectedEp, onSelect, maxHeight }: EpisodeListProps) {
  if (loading) return <div className="space-y-3">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (!episodes.length) return <p className="text-muted-foreground text-sm text-center py-4">No episodes found.</p>;
  return <div className="overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2" style={{ maxHeight }}>{episodes.map((ep) => <button key={ep.number} data-testid={`ep-btn-${ep.number}`} onClick={() => onSelect(ep.number)} className={`flex gap-3 items-center text-left p-2.5 rounded-lg transition-all border w-full ${selectedEp === ep.number ? "bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] text-primary" : "bg-secondary/30 border-transparent hover:bg-secondary hover:border-primary/30 text-foreground"}`}><div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-xs ${selectedEp === ep.number ? "bg-primary text-black" : "bg-black/50 text-muted-foreground"}`}>{ep.number}</div><div className="flex flex-col gap-0.5 flex-1 min-w-0"><h4 className="text-sm font-medium line-clamp-1" title={ep.title || `Episode ${ep.number}`}>{ep.title || `Episode ${ep.number}`}</h4>{ep.aired && <p className="text-xs opacity-60 line-clamp-1">{new Date(ep.aired).toLocaleDateString()}</p>}</div>{ep.filler && <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/10 px-1 py-0 shrink-0">FILLER</Badge>}</button>)}</div>;
}
