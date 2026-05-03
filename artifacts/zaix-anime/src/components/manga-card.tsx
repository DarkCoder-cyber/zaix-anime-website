import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Plus, Check, Flame, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLibrary } from "@/hooks/use-local-store";
import { toast } from "sonner";

export interface MangaItem {
  id: string;
  title: string;
  image: string | null;
  description?: string | null;
  status?: string | null;
  year?: number | null;
  genres?: string[];
  type?: string;
  lastChapter?: string | null;
  author?: string | null;
}

interface MangaCardProps {
  manga: MangaItem;
  isHot?: boolean;
  isNew?: boolean;
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

export function MangaCard({ manga, isHot = false, isNew = false }: MangaCardProps) {
  const { addToLibrary, removeFromLibrary, isInLibrary } = useLibrary();
  const saved = isInLibrary(manga.id);
  const { ref, visible } = useInView<HTMLImageElement>();
  const typeColor = manga.type === "Manhwa" ? "bg-blue-500/80 text-white" : manga.type === "Manhua" ? "bg-orange-500/80 text-white" : "bg-primary/80 text-black";

  function handleLibrary(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      removeFromLibrary(manga.id);
      toast.success("Removed from library", { description: manga.title, duration: 2000 });
    } else {
      addToLibrary({ id: manga.id, type: "manga", title: manga.title, image: manga.image });
      toast.success("Saved to library! 📚", { description: manga.title, duration: 2500 });
    }
  }

  return (
    <Link href={`/manga/${manga.id}`} className="group block h-full focus:outline-none" data-testid={`card-manga-${manga.id}`}>
      <Card className="h-full bg-card border-transparent overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:shadow-neon group-hover:scale-[1.02] transform-gpu">
        <CardContent className="p-0 relative aspect-[3/4]">
          {visible ? manga.image ? <img ref={ref} src={manga.image} alt={manga.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 transform-gpu" loading="lazy" decoding="async" /> : <div ref={ref as any} className="w-full h-full bg-secondary flex items-center justify-center"><BookOpen className="w-12 h-12 text-primary/30" /></div> : <div ref={ref as any} className="w-full h-full bg-secondary/80 animate-pulse" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            {manga.type && <Badge className={`text-[10px] font-bold px-1.5 py-0.5 ${typeColor}`}>{manga.type}</Badge>}
            {isHot && <span className="badge-hot flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded"><Flame className="w-3 h-3" /> HOT</span>}
            {isNew && !isHot && <span className="badge-new flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded"><Sparkles className="w-3 h-3" /> NEW</span>}
          </div>
          <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
            <button onClick={handleLibrary} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-10 ${saved ? "bg-primary text-black shadow-neon" : "bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-black"}`} title={saved ? "Remove from library" : "Save to library"}>{saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}</button>
            {manga.status && <Badge variant="outline" className="bg-black/60 border-white/20 backdrop-blur-sm text-xs capitalize">{manga.status}</Badge>}
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-md transform-gpu" style={{ transform: "translateZ(0)" }}><BookOpen className="w-7 h-7 text-primary" /></div>
          </div>
          <div className="absolute bottom-0 left-0 w-full p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 transform-gpu" style={{ willChange: "transform" }}>
            <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors text-shadow-neon">{manga.title}</h3>
            <div className="flex flex-wrap gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">{manga.genres?.slice(0, 2).map((genre) => <span key={genre} className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/80">{genre}</span>)}</div>
            {manga.lastChapter && <p className="text-xs text-muted-foreground">Ch. {manga.lastChapter}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
