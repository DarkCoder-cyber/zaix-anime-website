import { useState } from "react";
import { useParams, Link } from "wouter";
import { Play, Pause, Volume2, Maximize, Settings, SkipBack, SkipForward, Star, Info, Share2, Heart, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TRENDING_ANIME, NEW_RELEASES } from "@/data/mock";
import { AnimeCard } from "@/components/anime-card";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [quality, setQuality] = useState("1080p");
  const [progress, setProgress] = useState(30);

  // Find anime from mock data
  const allAnime = [...TRENDING_ANIME, ...NEW_RELEASES];
  const anime = allAnime.find(a => a.id === id) || allAnime[0];

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="container mx-auto px-4 max-w-7xl mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Video Player Placeholder */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon group">
              
              {/* Fake Video Screen */}
              <div className="absolute inset-0 bg-secondary flex items-center justify-center bg-opacity-50">
                <img src={anime.image} alt={anime.title} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
                
                {/* Center Play Button Overlay */}
                <button 
                  onClick={togglePlay}
                  className={`w-20 h-20 rounded-full bg-black/60 border-2 border-primary flex items-center justify-center backdrop-blur-md shadow-neon-intense hover:scale-110 transition-transform z-10 ${isPlaying ? 'opacity-0' : 'opacity-100'} group-hover:opacity-100`}
                >
                  {isPlaying ? <Pause className="w-10 h-10 text-primary" /> : <Play className="w-10 h-10 text-primary ml-1" />}
                </button>
              </div>

              {/* Top Overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <h2 className="text-white font-bold text-lg drop-shadow-md">{anime.title} - Episode 1</h2>
                <Badge className="bg-primary text-black">HD</Badge>
              </div>

              {/* Bottom Player Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-3">
                
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/80 font-mono">06:45</span>
                  <div className="flex-1 relative h-1.5 bg-white/20 rounded-full cursor-pointer group/slider">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary rounded-full shadow-[0_0_10px_#39FF14]" 
                      style={{ width: `${progress}%` }}
                    />
                    <div className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity shadow-neon" style={{ left: `calc(${progress}% - 8px)` }} />
                  </div>
                  <span className="text-xs text-white/80 font-mono">24:00</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button className="text-white hover:text-primary transition-colors"><SkipBack className="w-5 h-5" /></button>
                    <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <button className="text-white hover:text-primary transition-colors"><SkipForward className="w-5 h-5" /></button>
                    
                    <div className="flex items-center gap-2 ml-4 group/vol">
                      <Volume2 className="w-5 h-5 text-white hover:text-primary transition-colors cursor-pointer" />
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                        <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-white flex items-center gap-1 hover:text-primary transition-colors text-sm font-medium">
                          <Settings className="w-5 h-5" />
                          <span className="hidden sm:inline">{quality}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-primary/30 min-w-[120px]">
                        {['1080p', '720p', '480p', '360p'].map(q => (
                          <DropdownMenuItem 
                            key={q} 
                            onClick={() => setQuality(q)}
                            className={`cursor-pointer hover:bg-primary/20 ${quality === q ? 'text-primary focus:text-primary bg-primary/10' : 'text-foreground'}`}
                          >
                            {q} {q === '1080p' && <Badge className="ml-auto text-[10px] h-4 bg-primary/20 text-primary border-0">Premium</Badge>}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button className="text-white hover:text-primary transition-colors"><Maximize className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Anime Info */}
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2">{anime.title}</h1>
                  <p className="text-primary font-medium">Episode 1: The Beginning</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-secondary/50 text-foreground border-border text-sm px-3 py-1">
                    <Star className="w-4 h-4 mr-1.5 text-primary fill-primary" /> {anime.rating}
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
              </div>

              <div className="mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base border-t border-border pt-4">
                <p>
                  In a world where chaos reigns and ancient powers awaken, a new journey begins. 
                  Watch as our protagonist faces incredible challenges, makes unlikely allies, and 
                  uncovers truths that will shake the foundation of their universe. This critically 
                  acclaimed anime brings stunning visuals, pulse-pounding action, and a gripping 
                  storyline that will keep you on the edge of your seat.
                </p>
              </div>
            </div>

          </div>

          {/* Sidebar - Up Next */}
          <div className="flex flex-col gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-lg font-bold font-heading text-white border-b border-border pb-3 mb-4">Up Next</h3>
              
              <div className="flex flex-col gap-4">
                {[2, 3, 4].map(ep => (
                  <button key={ep} className="flex gap-3 items-start group text-left p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="relative w-28 aspect-video bg-secondary rounded-md overflow-hidden shrink-0 border border-transparent group-hover:border-primary/50 transition-colors">
                      <img src={anime.image} alt={`Episode ${ep}`} className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                        <Play className="w-6 h-6 text-primary fill-primary/50" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-mono px-1 rounded text-white">24:00</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-medium text-white group-hover:text-primary transition-colors line-clamp-2">Episode {ep}: The Awakening Power</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">Sub | Dub</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
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
                <input type="text" placeholder="Say something..." className="w-full bg-secondary border border-border rounded-full py-2 px-4 text-sm focus:outline-none focus:border-primary/50 text-white" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-primary p-1 hover:bg-primary/10 rounded-full">
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
