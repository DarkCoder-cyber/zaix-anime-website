import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Star, PlayCircle, Plus, Check, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLibrary } from "@/hooks/use-local-store";
import { toast } from "sonner";

export interface Anime {
  malId: number;
  title: string;
  image: string;
  episodes?: number | null;
  score?: number | null;
  status?: string | null;
  genres: string[];
  synopsis?: string | null;
  year?: number | null;
  type?: string | null;
  isNew?: boolean;
  releaseDate?: string;
}

interface AnimeCardProps {
  anime: Anime;
  layout?: "trending" | "new";
}

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "250px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export function AnimeCard({ anime, layout = "trending" }: AnimeCardProps) {
  const { addToLibrary, removeFromLibrary, isInLibrary } = useLibrary();
  const id = String(anime.malId);
  const saved = isInLibrary(id);
  const isHot = (anime.score ?? 0) >= 8.5;
  const { ref, visible } = useInView<HTMLImageElement>();

  function handleLibrary(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      removeFromLibrary(id);
      toast.success("Removed from library", { description: anime.title, duration: 2000 });
    } else {
      addToLibrary({ id, type: "anime", title: anime.title, image: anime.image });
      toast.success("Saved to library! 🎌", { description: anime.title, duration: 2500 });
    }
  }

  return (
    <Link href={`/watch/${anime.malId}`} className="group block h-full focus:outline-none" data-testid={`card-anime-${anime.malId}`}>
      <Card className="h-full bg-card border-transparent overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:shadow-neon group-hover:scale-[1.02] transform-gpu">
        <CardContent className="p-0 relative aspect-[3/4]">
          {visible ? (
            <img ref={ref} src={anime.image} alt={anime.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 transform-gpu" loading="lazy" decoding="async" />
          ) : (
            <div ref={ref as any} className="w-full h-full bg-secondary/80 animate-pulse" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <Badge variant="secondary" className="bg-black/60 text-primary border-primary/50 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-primary" /> {anime.score?.toFixed(1) || "N/A"}
            </Badge>
            {layout === "new" && anime.isNew && <Badge className="bg-primary text-black font-bold animate-pulse-glow">NEW</Badge>}
            {isHot && <span className="badge-hot flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded"><Flame className="w-3 h-3" /> HOT</span>}
          </div>
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
            <button onClick={handleLibrary} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-10 ${saved ? "bg-primary text-black shadow-neon" : "bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-black"}`} title={saved ? "Remove from library" : "Save to library"}>
              {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
            {layout === "trending" && <>{anime.episodes ? <Badge variant="outline" className="bg-black/60 border-white/20 backdrop-blur-sm text-xs">EP {anime.episodes}</Badge> : null}{anime.type ? <Badge variant="outline" className="bg-black/60 border-primary/50 backdrop-blur-sm text-[10px] text-primary uppercase">{anime.type}</Badge> : null}</>}
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-md transform-gpu" style={{ transform: "translateZ(0)" }}>
              <PlayCircle className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 transform-gpu" style={{ willChange: "transform" }}>
            <h3 className="font-bold text-lg leading-tight line-clamp-1 mb-1 group-hover:text-primary transition-colors text-shadow-neon">{anime.title}</h3>
            <div className="flex flex-wrap gap-1.5 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              {anime.genres.slice(0, 2).map((genre) => <span key={genre} className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/80">{genre}</span>)}
            </div>
            {layout === "new" && anime.releaseDate ? <p className="text-xs text-muted-foreground">{anime.releaseDate}</p> : anime.year ? <p className="text-xs text-muted-foreground">{anime.year}</p> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
