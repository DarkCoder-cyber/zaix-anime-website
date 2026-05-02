import { useState } from "react";
import { useParams } from "wouter";
import { Share2, Heart, MessageSquare, Star, Send, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAnimeById, useGetAnimeEpisodes, useGetEpisodeStream, getGetAnimeByIdQueryKey, getGetAnimeEpisodesQueryKey, getGetEpisodeStreamQueryKey } from "@workspace/api-client-react";
import { VideoPlayer } from "@/components/video-player";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const malId = parseInt(id || "0");
  const [selectedEp, setSelectedEp] = useState<number>(1);
  const [episodeId, setEpisodeId] = useState("");

  const { data: anime, isLoading: animeLoading } = useGetAnimeById(malId, { query: { enabled: malId > 0, queryKey: getGetAnimeByIdQueryKey(malId) } });
  const { data: episodesData, isLoading: epsLoading } = useGetAnimeEpisodes(malId, {}, { query: { enabled: malId > 0, queryKey: getGetAnimeEpisodesQueryKey(malId, {}) } });
  
  // Only query stream if we have an episodeId
  const { data: streamData, isLoading: streamLoading } = useGetEpisodeStream(
    { episodeId, provider: "aniwatch" }, 
    { query: { enabled: !!episodeId, queryKey: getGetEpisodeStreamQueryKey({ episodeId, provider: "aniwatch" }) } }
  );

  const episodes = episodesData?.data ?? [];

  const handleEpisodeClick = (epNumber: number) => {
    setSelectedEp(epNumber);
    // Generate simple slug from title for aniwatch id format
    if (anime?.title) {
      const slug = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setEpisodeId(slug + "-" + malId + "?ep=" + epNumber);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="container mx-auto px-4 max-w-7xl mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Video Player Section */}
            {streamLoading ? (
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-primary font-medium animate-pulse">Loading stream...</p>
                </div>
              </div>
            ) : streamData?.sources && streamData.sources.length > 0 ? (
              <VideoPlayer 
                sources={streamData.sources} 
                headers={streamData.headers} 
                posterUrl={anime?.image} 
              />
            ) : (
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon group">
                <div className="absolute inset-0 bg-secondary flex items-center justify-center bg-opacity-50">
                  {anime?.image && <img src={anime.image} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/50 flex flex-col items-center justify-center gap-4 z-10 p-6 text-center">
                    <Play className="w-16 h-16 text-primary/50 mb-2" />
                    <h2 className="text-2xl font-bold text-white font-heading">Ready to watch?</h2>
                    <p className="text-muted-foreground max-w-md">
                      {episodes.length > 0 
                        ? "Select an episode from the list below to start streaming." 
                        : "Episode list is loading or currently unavailable."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Anime Info */}
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden">
              {/* Background blur effect */}
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
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-32 w-full mt-4" />
                  </div>
                ) : anime ? (
                  <>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2">{anime.title}</h1>
                        {anime.titleEnglish && <p className="text-muted-foreground text-sm mb-2">{anime.titleEnglish}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <p className="text-primary font-medium">Episode {selectedEp}</p>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-muted-foreground text-sm">{anime.status}</span>
                          {anime.aired && (
                            <>
                              <span className="text-muted-foreground text-xs">•</span>
                              <span className="text-muted-foreground text-sm">{anime.aired}</span>
                            </>
                          )}
                          {anime.studios && anime.studios.length > 0 && (
                            <>
                              <span className="text-muted-foreground text-xs">•</span>
                              <span className="text-muted-foreground text-sm">{anime.studios.join(", ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-secondary/50 text-foreground border-border text-sm px-3 py-1">
                          <Star className="w-4 h-4 mr-1.5 text-primary fill-primary" /> {anime.score?.toFixed(1) || "N/A"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" className="border-border hover:border-primary hover:text-primary bg-secondary/50">
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="border-border hover:border-primary hover:text-primary bg-secondary/50">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {anime.genres.map(g => (
                        <Badge key={g} variant="outline" className="border-primary/30 text-primary/80 bg-primary/5">
                          {g}
                        </Badge>
                      ))}
                      {anime.type && (
                        <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
                          {anime.type}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base border-t border-border pt-4">
                      <p className="whitespace-pre-line">{anime.synopsis || "No synopsis available for this anime."}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">Failed to load anime details.</p>
                )}
              </div>
            </div>

            {/* Episode List (Mobile only, moves to sidebar on desktop) */}
            <div className="lg:hidden bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4">Episodes</h3>
              
              {epsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : episodes.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                  {episodes.map((ep) => (
                    <button 
                      key={ep.number} 
                      onClick={() => handleEpisodeClick(ep.number)}
                      className={`flex gap-3 items-center text-left p-3 rounded-lg transition-all border ${selectedEp === ep.number ? 'bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] text-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary hover:border-primary/30 text-foreground'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-xs ${selectedEp === ep.number ? 'bg-primary text-black' : 'bg-black/50 text-muted-foreground'}`}>
                        {ep.number}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-1">
                          {ep.title || `Episode ${ep.number}`}
                        </h4>
                        {ep.aired && <p className="text-xs text-muted-foreground line-clamp-1">{new Date(ep.aired).toLocaleDateString()}</p>}
                      </div>
                      {ep.filler && (
                        <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/10 px-1 py-0">FILLER</Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No episodes found.</p>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            
            {/* Desktop Episode List */}
            <div className="hidden lg:block bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex justify-between items-center">
                <span>Episodes</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">{episodes.length}</Badge>
              </h3>
              
              {epsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : episodes.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                  {episodes.map((ep) => (
                    <button 
                      key={ep.number} 
                      onClick={() => handleEpisodeClick(ep.number)}
                      className={`flex gap-3 items-center text-left p-2.5 rounded-lg transition-all border ${selectedEp === ep.number ? 'bg-primary/10 border-primary shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] text-primary' : 'bg-secondary/30 border-transparent hover:bg-secondary hover:border-primary/30 text-foreground'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold font-mono text-xs ${selectedEp === ep.number ? 'bg-primary text-black' : 'bg-black/50 text-muted-foreground'}`}>
                        {ep.number}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <h4 className="text-sm font-medium line-clamp-1" title={ep.title || `Episode ${ep.number}`}>
                          {ep.title || `Episode ${ep.number}`}
                        </h4>
                        {ep.aired && <p className="text-xs opacity-70 line-clamp-1">{new Date(ep.aired).toLocaleDateString()}</p>}
                      </div>
                      {ep.filler && (
                        <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/10 px-1 py-0 shrink-0">FILLER</Badge>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No episodes found.</p>
              )}
            </div>

            {/* Live Chat */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Live Chat
              </h3>
              <div className="h-[250px] flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-2 mb-4">
                <div className="text-sm"><span className="text-primary font-bold">AnimeFan99:</span> THIS ANIMATION IS INSANE 🔥</div>
                <div className="text-sm"><span className="text-blue-400 font-bold">KiraKun:</span> Best episode so far imo</div>
                <div className="text-sm"><span className="text-pink-400 font-bold">SakuraChan:</span> I can't wait for the next arc!!</div>
                <div className="text-sm"><span className="text-yellow-400 font-bold">WeebMaster:</span> the OP song goes incredibly hard</div>
              </div>
              <div className="relative">
                <input type="text" placeholder="Say something..." className="w-full bg-secondary border border-border rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:border-primary/50 text-white" />
                <button className="absolute right-1 top-1/2 -translate-y-1/2 text-primary p-1.5 hover:bg-primary/10 rounded-full transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
