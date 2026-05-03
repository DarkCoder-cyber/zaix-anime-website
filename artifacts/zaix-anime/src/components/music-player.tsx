import { useState, useEffect, useRef } from "react";
import { Music, Music2, VolumeX, Volume2, X, ChevronDown, ChevronUp } from "lucide-react";

const STATIONS = [
  { label: "Lofi Girl", id: "jfKfPfyJRdk" },
  { label: "Phonk Vibes", id: "nqkJKbxHKQU" },
  { label: "Anime OST", id: "sqS_JMnIyps" },
];

export function MusicPlayer() {
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [stationIdx, setStationIdx] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const station = STATIONS[stationIdx];
  const src = enabled
    ? `https://www.youtube.com/embed/${station.id}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&rel=0&showinfo=0&enablejsapi=1`
    : "";

  // Reset iframe when station changes
  const iframeKey = `${stationIdx}-${enabled}`;

  return (
    <>
      {/* Floating toggle button (always visible) */}
      <button
        onClick={() => {
          if (!enabled) {
            setEnabled(true);
            setCollapsed(false);
          } else {
            setCollapsed((c) => !c);
          }
        }}
        className={`relative p-2 rounded-lg transition-colors ${
          enabled
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-foreground/80 hover:text-primary hover:bg-primary/10"
        }`}
        title={enabled ? "Music playing" : "Play background music"}
        aria-label="Background music"
      >
        {enabled ? (
          <Music2 className="w-5 h-5 animate-pulse" />
        ) : (
          <Music className="w-5 h-5" />
        )}
        {enabled && !collapsed && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary shadow-neon animate-pulse" />
        )}
      </button>

      {/* Floating player panel */}
      {enabled && !collapsed && (
        <div className="fixed bottom-20 right-4 z-50 w-72 bg-black/95 backdrop-blur-xl border border-primary/30 rounded-xl shadow-neon-intense overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Music2 className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-xs font-bold text-primary">Background Music</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMuted((m) => !m)}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setCollapsed(true)}
                className="p-1 rounded text-muted-foreground hover:text-white transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEnabled(false)}
                className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Station selector */}
          <div className="flex gap-1 px-3 pt-2">
            {STATIONS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStationIdx(i)}
                className={`flex-1 text-[10px] font-semibold py-1 rounded transition-all ${
                  i === stationIdx
                    ? "bg-primary text-black shadow-neon"
                    : "bg-secondary/50 text-muted-foreground hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* YouTube iframe */}
          <div className="relative mt-2 mx-3 mb-3 rounded-lg overflow-hidden aspect-video bg-black border border-primary/10">
            {enabled && (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={src}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                title="Background music"
              />
            )}
          </div>

          {/* Now playing label */}
          <div className="px-3 pb-3 -mt-1">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-primary rounded-full animate-bounce"
                    style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-primary">Now playing: {station.label}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mini pill when collapsed */}
      {enabled && collapsed && (
        <div
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 bg-black/90 border border-primary/40 rounded-full px-3 py-1.5 shadow-neon cursor-pointer animate-in fade-in duration-200"
          onClick={() => setCollapsed(false)}
        >
          <div className="flex gap-0.5 items-end h-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-primary rounded-full animate-bounce"
                style={{ height: `${4 + (i % 2) * 4}px`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-primary font-medium">{station.label}</span>
          <ChevronUp className="w-3 h-3 text-primary/60" />
        </div>
      )}
    </>
  );
}
