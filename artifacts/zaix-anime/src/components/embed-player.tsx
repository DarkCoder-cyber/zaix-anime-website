import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronDown, RefreshCw, AlertTriangle, Play, Tv2 } from "lucide-react";

export interface EmbedProvider {
  name: string;
  url: string;
  type: "embed";
}

interface EmbedPlayerProps {
  providers: EmbedProvider[];
  posterUrl?: string | null;
  title?: string;
}

export function EmbedPlayer({ providers, posterUrl, title }: EmbedPlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = providers[currentIdx];

  const handleLoad = useCallback(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    setLoading(false);
    setError(false);
  }, []);

  const tryNext = useCallback(() => {
    if (currentIdx < providers.length - 1) {
      setCurrentIdx((i) => i + 1);
      setLoading(true);
      setError(false);
    } else {
      setError(true);
      setLoading(false);
    }
  }, [currentIdx, providers.length]);

  const handleError = useCallback(() => {
    tryNext();
  }, [tryNext]);

  // Timeout fallback — if iframe doesn't load in 12s, try next source
  useEffect(() => {
    setLoading(true);
    setError(false);
    errorTimer.current = setTimeout(() => {
      // Don't auto-switch on timeout — let user decide (some embeds just take long)
      setLoading(false);
    }, 12000);
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, [currentIdx]);

  if (!providers || providers.length === 0) {
    return (
      <div className="w-full aspect-video bg-black rounded-xl flex items-center justify-center"
        style={{ border: "1px solid rgba(168,85,247,0.2)" }}>
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-purple-400/40 mx-auto mb-3" />
          <p className="text-white/40 text-sm">No stream sources available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Player container */}
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative group"
        style={{ border: "1px solid rgba(168,85,247,0.2)", boxShadow: "0 0 40px rgba(0,0,0,0.8)" }}>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}>
            {posterUrl && (
              <img src={posterUrl} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-10" />
            )}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-2 rounded-full animate-spin"
                style={{ borderColor: "rgba(168,85,247,0.2)", borderTopColor: "#a855f7" }} />
              <p className="text-white/50 text-sm font-medium">Loading stream…</p>
              <p className="text-white/25 text-xs">{current?.name}</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
            style={{ background: "rgba(0,0,0,0.92)" }}>
            <AlertTriangle className="w-10 h-10 text-purple-400/60" />
            <div className="text-center">
              <p className="text-white font-semibold mb-1">All sources exhausted</p>
              <p className="text-white/40 text-sm">Try refreshing or come back later</p>
            </div>
            <button
              onClick={() => { setCurrentIdx(0); setLoading(true); setError(false); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
              style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)" }}
            >
              <RefreshCw className="w-4 h-4" /> Retry from start
            </button>
          </div>
        )}

        {/* Iframe player */}
        {current && (
          <iframe
            ref={iframeRef}
            key={current.url}
            src={current.url}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            onError={handleError}
            style={{ border: "none" }}
          />
        )}

        {/* Provider switcher overlay (top-right, appears on hover) */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="relative">
            <button
              onClick={() => setShowProviders((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(168,85,247,0.3)", backdropFilter: "blur(8px)" }}
            >
              <Tv2 className="w-3.5 h-3.5 text-purple-400" />
              {current?.name}
              <ChevronDown className="w-3 h-3 text-white/50" />
            </button>
            {showProviders && (
              <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden shadow-2xl min-w-[160px]"
                style={{ background: "rgba(10,10,10,0.97)", border: "1px solid rgba(168,85,247,0.25)", backdropFilter: "blur(16px)" }}>
                {providers.map((p, i) => (
                  <button
                    key={p.url}
                    onClick={() => { setCurrentIdx(i); setLoading(true); setError(false); setShowProviders(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-purple-500/10 flex items-center gap-2"
                    style={{ color: i === currentIdx ? "#a855f7" : "rgba(255,255,255,0.6)", borderBottom: i < providers.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    {i === currentIdx && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
                    {i !== currentIdx && <span className="w-1.5 h-1.5 rounded-full bg-transparent flex-shrink-0" />}
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source pills below player */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-white/30 font-medium">Sources:</span>
        {providers.map((p, i) => (
          <button
            key={p.url}
            onClick={() => { setCurrentIdx(i); setLoading(true); setError(false); }}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all hover:scale-105"
            style={i === currentIdx
              ? { background: "rgba(168,85,247,0.25)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.45)" }
              : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => tryNext()}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <RefreshCw className="w-3 h-3" /> Try next
        </button>
      </div>

      <p className="text-[11px] text-white/20 text-center">
        If a source shows a black screen or error, click "Try next" to switch to a backup source.
      </p>
    </div>
  );
}
