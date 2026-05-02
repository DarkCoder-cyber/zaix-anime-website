import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpen, Star, ChevronRight, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface MangaDetail {
  id: string;
  title: string;
  image: string | null;
  description: string | null;
  status: string | null;
  year: number | null;
  genres: string[];
  themes: string[];
  type: string;
  lastChapter: string | null;
  author: string | null;
  originalLanguage: string | null;
}

interface Chapter {
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
  publishAt: string | null;
  volume: string | null;
}

export default function MangaPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [mangaLoading, setMangaLoading] = useState(true);
  const [mangaError, setMangaError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    setMangaLoading(true);
    setMangaError(null);
    fetch(`/api/manga/${id}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error || "Not found"));
        return r.json();
      })
      .then((data) => { setManga(data); setMangaLoading(false); })
      .catch((e) => { setMangaError(String(e)); setMangaLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setChaptersLoading(true);
    setChaptersError(null);
    fetch(`/api/manga/${id}/chapters?limit=500`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.error || "Failed to load chapters"));
        return r.json();
      })
      .then((data) => { setChapters(data.data ?? []); setChaptersLoading(false); })
      .catch((e) => { setChaptersError(String(e)); setChaptersLoading(false); });
  }, [id]);

  const displayedChapters = showAll ? chapters : chapters.slice(0, 50);
  const typeColor =
    manga?.type === "Manhwa"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : manga?.type === "Manhua"
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
      : "bg-primary/20 text-primary border-primary/30";

  return (
    <div className="min-h-screen bg-background pt-16 pb-20">
      <div className="container mx-auto px-4 max-w-5xl mt-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4 text-muted-foreground hover:text-primary gap-2"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Button>

        {mangaError && (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <h2 className="text-xl font-bold text-white">Failed to Load</h2>
            <p className="text-muted-foreground text-sm max-w-md">{mangaError}</p>
            <p className="text-xs text-muted-foreground">MangaDex may be temporarily unavailable. Please try again.</p>
            <Button className="bg-primary text-black" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {!mangaError && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left: Cover + Info */}
            <div className="flex flex-col gap-5">
              {mangaLoading ? (
                <Skeleton className="w-full aspect-[3/4] rounded-xl" />
              ) : manga?.image ? (
                <div className="relative rounded-xl overflow-hidden border border-primary/20 shadow-neon">
                  <img src={manga.image} alt={manga.title} className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : (
                <div className="w-full aspect-[3/4] bg-secondary rounded-xl flex items-center justify-center border border-border">
                  <BookOpen className="w-16 h-16 text-primary/30" />
                </div>
              )}

              {mangaLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : manga && (
                <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className={typeColor}>{manga.type}</Badge>
                  </div>
                  {manga.status && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="text-white capitalize">{manga.status}</span>
                    </div>
                  )}
                  {manga.year && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Year</span>
                      <span className="text-white">{manga.year}</span>
                    </div>
                  )}
                  {manga.author && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Author</span>
                      <span className="text-white text-right line-clamp-1">{manga.author}</span>
                    </div>
                  )}
                  {manga.lastChapter && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Chapters</span>
                      <span className="text-primary font-medium">Ch. {manga.lastChapter}</span>
                    </div>
                  )}
                  <a
                    href={`https://mangadex.org/title/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View on MangaDex
                  </a>
                </div>
              )}
            </div>

            {/* Right: Details + Chapters */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {mangaLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : manga && (
                <>
                  <div>
                    <div className="flex items-start gap-3 flex-wrap mb-3">
                      <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white leading-tight flex-1">
                        {manga.title}
                      </h1>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {manga.genres?.map((g) => (
                        <Badge key={g} variant="outline" className="border-primary/30 text-primary/80 bg-primary/5 text-xs">
                          {g}
                        </Badge>
                      ))}
                      {manga.themes?.slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="border-white/20 text-white/60 bg-white/5 text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    {manga.description && (
                      <div className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                        <p className="line-clamp-6">{manga.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Start Reading CTA */}
                  {chapters.length > 0 && (
                    <Button
                      className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold w-fit gap-2"
                      onClick={() => setLocation(`/read/${id}/${chapters[0].id}`)}
                    >
                      <BookOpen className="w-4 h-4" /> Start Reading — Ch. {chapters[0].chapter ?? "1"}
                    </Button>
                  )}
                </>
              )}

              {/* Chapter List */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-bold font-heading text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" /> Chapters
                    {chapters.length > 0 && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary ml-1">{chapters.length}</Badge>
                    )}
                  </h3>
                </div>

                {chaptersLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : chaptersError ? (
                  <div className="p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">{chaptersError}</p>
                    <p className="text-xs text-muted-foreground mt-1">MangaDex may be rate-limiting. Try again shortly.</p>
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No English chapters available yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-[500px] overflow-y-auto custom-scrollbar">
                    {displayedChapters.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setLocation(`/read/${id}/${ch.id}`)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 hover:border-l-2 hover:border-primary transition-all text-left group"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                            Chapter {ch.chapter ?? "?"}
                            {ch.title && (
                              <span className="text-muted-foreground font-normal ml-2 line-clamp-1">
                                — {ch.title}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {ch.volume && <span>Vol. {ch.volume}</span>}
                            {ch.pages > 0 && <span>{ch.pages} pages</span>}
                            {ch.publishAt && (
                              <span>{new Date(ch.publishAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                      </button>
                    ))}
                    {!showAll && chapters.length > 50 && (
                      <button
                        onClick={() => setShowAll(true)}
                        className="w-full py-4 text-center text-sm text-primary hover:bg-primary/5 transition-colors font-medium"
                      >
                        Show all {chapters.length} chapters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
