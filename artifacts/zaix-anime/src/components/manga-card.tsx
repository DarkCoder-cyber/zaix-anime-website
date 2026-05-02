import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

export function MangaCard({ manga }: { manga: MangaItem }) {
  const typeColor =
    manga.type === "Manhwa"
      ? "bg-blue-500/80 text-white"
      : manga.type === "Manhua"
      ? "bg-orange-500/80 text-white"
      : "bg-primary/80 text-black";

  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group block h-full focus:outline-none"
      data-testid={`card-manga-${manga.id}`}
    >
      <Card className="h-full bg-card border-transparent overflow-hidden transition-all duration-300 group-hover:border-primary group-hover:shadow-neon group-hover:scale-[1.02]">
        <CardContent className="p-0 relative aspect-[3/4]">
          {manga.image ? (
            <img
              src={manga.image}
              alt={manga.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-primary/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            {manga.type && (
              <Badge className={`text-[10px] font-bold px-1.5 py-0.5 ${typeColor}`}>
                {manga.type}
              </Badge>
            )}
          </div>

          {manga.status && (
            <div className="absolute top-2 left-2">
              <Badge
                variant="outline"
                className="bg-black/60 border-white/20 backdrop-blur-sm text-xs capitalize"
              >
                {manga.status}
              </Badge>
            </div>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center backdrop-blur-md">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="font-bold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors text-shadow-neon">
              {manga.title}
            </h3>
            <div className="flex flex-wrap gap-1 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
              {manga.genres?.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white/80"
                >
                  {genre}
                </span>
              ))}
            </div>
            {manga.lastChapter && (
              <p className="text-xs text-muted-foreground">Ch. {manga.lastChapter}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
