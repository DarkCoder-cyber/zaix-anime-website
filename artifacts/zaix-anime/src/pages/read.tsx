import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, ArrowLeft, ZoomIn, ZoomOut, AlignJustify, Columns, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Page {
  index: number;
  url: string;
  filename: string;
}

interface ChapterData {
  chapterId: string;
  pages: Page[];
  total: number;
}

type ReadMode = "scroll" | "paginated";

async function fetchChapterPages(chapterId: string, dataSaver: boolean): Promise<ChapterData> {
  const url = `/api/manga/chapter/${chapterId}/pages?dataSaver=${dataSaver}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Network error — could not reach the server.");
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server error ${res.status}`);
    }
    throw new Error(`Server returned ${res.status}. The API server may not be running.`);
  }

  if (!isJson) {
    throw new Error("Unexpected response from API — check that the server is running on port 8080.");
  }

  const data: ChapterData = await res.json();
  if (!data || typeof data.total !== "number") {
    throw new Error("Invalid response format from chapter pages API.");
  }
  return data;
}

// Single page image component — avoids the display:none bug where lazy images
// never get fetched. Uses visibility + absolute overlay pattern instead.
function PageImage({
  page,
  eager,
}: {
  page: Page;
  eager: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle images that were already cached and load synchronously
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setState("loaded");
    }
  }, [page.url]);

  return (
    <div className="w-full relative bg-secondary/20">
      {/* Skeleton overlay — sits on top while loading */}
      {state === "loading" && (
        <div className="absolute inset-0 z-10 bg-secondary/40 animate-pulse min-h-[300px]" />
      )}

      {/* Error state */}
      {state === "error" && (
        <div className="w-full aspect-[3/4] bg-secondary/50 border border-border flex flex-col items-center justify-center gap-3">
          <span className="text-muted-foreground text-sm">Page {page.index + 1} failed to load</span>
          <button
            className="text-xs text-primary border border-primary/30 px-3 py-1 rounded hover:bg-primary/10 transition-colors"
            onClick={() => setState("loading")}
          >
            Retry
          </button>
        </div>
      )}

      {/* Always rendered so browser fetches it — no display:none */}
      <img
        ref={imgRef}
        src={state === "error" ? undefined : page.url}
        alt={`Page ${page.index + 1}`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className={`w-full h-auto select-none transition-opacity duration-300 ${
          state === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
    </div>
  );
}

// Paginated single-page view
function PaginatedImage({ page }: { page: Page }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setState("loading");
  }, [page.url]);

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setState("loaded");
    }
  }, [page.url]);

  return (
    <div className="w-full relative bg-secondary/20 min-h-[200px]">
      {state === "loading" && (
        <div className="absolute inset-0 z-10 bg-secondary/40 animate-pulse" />
      )}
      {state === "error" ? (
        <div className="w-full aspect-[3/4] bg-secondary/50 border border-border flex flex-col items-center justify-center gap-3">
          <span className="text-muted-foreground text-sm">Page failed to load</span>
          <button
            className="text-xs text-primary border border-primary/30 px-3 py-1 rounded hover:bg-primary/10 transition-colors"
            onClick={() => setState("loading")}
          >
            Retry
          </button>
        </div>
      ) : (
        <img
          ref={imgRef}
          key={page.url}
          src={page.url}
          alt={`Page ${page.index + 1}`}
          loading="eager"
          decoding="async"
          draggable={false}
          className={`w-full h-auto select-none transition-opacity duration-300 ${
            state === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
        />
      )}
    </div>
  );
}

export default function ReadPage() {
  const { mangaId, chapterId } = useParams<{ mangaId: string; chapterId: string }>();
  const [, setLocation] = useLocation();
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [readMode, setReadMode] = useState<ReadMode>("scroll");
  const [dataSaver, setDataSaver] = useState(false);

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    setChapterData(null);
    setCurrentPage(0);
    try {
      const data = await fetchChapterPages(chapterId, dataSaver);
      setChapterData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load chapter pages.");
    } finally {
      setLoading(false);
    }
  }, [chapterId, dataSaver]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const goToPage = useCallback(
    (n: number) => {
      if (!chapterData) return;
      const clamped = Math.max(0, Math.min(chapterData.total - 1, n));
      setCurrentPage(clamped);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [chapterData]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (readMode !== "paginated") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToPage(currentPage + 1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPage(currentPage - 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, goToPage, readMode]);

  const totalPages = chapterData?.total ?? 0;
  const progressPct = totalPages > 0 ? Math.round(((currentPage + 1) / totalPages) * 100) : 0;
  const isEmpty = !loading && !error && chapterData && chapterData.total === 0;
  const hasContent = !loading && !error && chapterData && chapterData.total > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-primary/20 h-14 flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:text-primary hover:bg-primary/10 shrink-0"
            onClick={() => setLocation(mangaId ? `/manga/${mangaId}` : "/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              Chapter {chapterId?.slice(0, 8)}…
            </p>
            {hasContent && (
              <p className="text-xs text-primary font-medium">
                Page {currentPage + 1} / {totalPages}
              </p>
            )}
            {isEmpty && (
              <p className="text-xs text-yellow-400 font-medium">External Chapter</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-1 ${readMode === "scroll" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setReadMode("scroll")}
          >
            <AlignJustify className="w-3.5 h-3.5" /> Scroll
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-1 ${readMode === "paginated" ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setReadMode("paginated")}
          >
            <Columns className="w-3.5 h-3.5" /> Page
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs ${dataSaver ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
            onClick={() => setDataSaver((d) => !d)}
            title="Toggle data saver (lower quality)"
          >
            {dataSaver ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {hasContent && (
        <div className="fixed top-14 left-0 right-0 z-40 h-0.5 bg-white/10">
          <div
            className="h-full bg-primary shadow-neon transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="pt-16 pb-24">

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-primary animate-pulse font-medium">Loading chapter pages…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-2">
              <span className="text-3xl">📖</span>
            </div>
            <h2 className="text-xl font-bold text-white">Failed to Load Chapter</h2>
            <p className="text-muted-foreground max-w-md text-sm">{error}</p>
            <div className="flex gap-3 mt-2">
              <Button className="bg-primary text-black hover:bg-primary/90 gap-2" onClick={loadChapter}>
                <RefreshCw className="w-4 h-4" /> Retry
              </Button>
              <Button variant="outline" className="border-primary/30 text-primary" onClick={() => setLocation(mangaId ? `/manga/${mangaId}` : "/")}>
                Back to Manga
              </Button>
            </div>
          </div>
        )}

        {/* External chapter — pages hosted outside MangaDex */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-2">
              <ExternalLink className="w-7 h-7 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-white">External Chapter</h2>
            <p className="text-muted-foreground max-w-md text-sm">
              This chapter is hosted on an external site and cannot be read here directly.
              You can read it on MangaDex which will redirect you to the publisher's site.
            </p>
            <div className="flex gap-3 mt-2 flex-wrap justify-center">
              <a
                href={`https://mangadex.org/chapter/${chapterId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-black font-bold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-neon"
              >
                <ExternalLink className="w-4 h-4" /> Read on MangaDex
              </a>
              <Button
                variant="outline"
                className="border-primary/30 text-primary"
                onClick={() => {
                  setDataSaver((d) => !d);
                }}
              >
                Try {dataSaver ? "High Quality" : "Data Saver"}
              </Button>
              <Button
                variant="outline"
                className="border-border text-muted-foreground"
                onClick={() => setLocation(mangaId ? `/manga/${mangaId}` : "/")}
              >
                Back to Manga
              </Button>
            </div>
          </div>
        )}

        {/* Scroll mode — vertical reading */}
        {hasContent && readMode === "scroll" && (
          <div className="flex flex-col items-center gap-0.5 max-w-3xl mx-auto">
            {chapterData!.pages.map((page) => (
              <PageImage key={page.index} page={page} eager={page.index < 3} />
            ))}
            {/* End of chapter */}
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <span className="text-2xl">🎉</span>
              </div>
              <p className="text-white font-bold">End of Chapter</p>
              <Button
                className="bg-primary text-black hover:bg-primary/90"
                onClick={() => setLocation(mangaId ? `/manga/${mangaId}` : "/")}
              >
                Back to Chapter List
              </Button>
            </div>
          </div>
        )}

        {/* Paginated mode — one page at a time */}
        {hasContent && readMode === "paginated" && (
          <div className="flex flex-col items-center">
            <div className="max-w-3xl w-full px-2">
              <PaginatedImage page={chapterData!.pages[currentPage]} />
            </div>

            <div className="flex items-center gap-4 mt-6 pb-8">
              <Button
                variant="outline"
                size="icon"
                className="border-primary/30 text-primary hover:bg-primary hover:text-black disabled:opacity-30"
                disabled={currentPage === 0}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-medium tabular-nums text-white">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="border-primary/30 text-primary hover:bg-primary hover:text-black disabled:opacity-30"
                disabled={currentPage === totalPages - 1}
                onClick={() => goToPage(currentPage + 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav bar (paginated mode) */}
      {hasContent && readMode === "paginated" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-t border-primary/20 h-14 flex items-center justify-center gap-4 px-4">
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-primary gap-1.5"
            disabled={currentPage === 0}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <div className="flex-1 max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground hover:text-primary gap-1.5"
            disabled={currentPage === totalPages - 1}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Click zones in paginated mode */}
      {hasContent && readMode === "paginated" && (
        <>
          <div
            className="fixed left-0 top-14 bottom-14 w-1/3 z-30 cursor-pointer"
            onClick={() => goToPage(currentPage - 1)}
            title="Previous page"
          />
          <div
            className="fixed right-0 top-14 bottom-14 w-1/3 z-30 cursor-pointer"
            onClick={() => goToPage(currentPage + 1)}
            title="Next page"
          />
        </>
      )}
    </div>
  );
}
