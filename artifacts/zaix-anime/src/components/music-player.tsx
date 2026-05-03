import { useState, useRef } from "react";
import { Music, Music2, VolumeX, Volume2, X, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

const STATIONS = [
  {
    label: "Lofi Girl",
    ids: [
      "jfKfPfyJRdk", // Official Lofi Girl 24/7 live stream
      "5qap5aO4i9A", // Lofi Hip Hop Radio — backup
    ],
  },
  {
    label: "Phonk Vibes",
    ids: [
      "r80Hmv0Y7Uk", // 1 Hour Phonk Mix — verified embeddable
      "6S1rMN4zrm8", // Dark Phonk Mix — backup
    ],
  },
  {
    label: "Anime OST",
    ids: [
      "KHuADlEVNSE", // Best Anime OSTs 2-hour compilation
      "dFiSLONBHEA", // Lofi Anime Study Mix — backup
    ],
  },
];

export function MusicPlayer() {
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [stationIdx, setStationIdx] = useState(0);
  const [idxOverride, setIdxOverride] = useState<number[]>(STATIONS.map(() => 0));
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const station = STATIONS[stationIdx];
  const activeIdIdx = idxOverride[stationIdx];
  const activeId = station.ids[activeIdIdx];

  const src = enabled
    ? `https://www.youtube.com/embed/${activeId}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&rel=0&showinfo=0&modestbranding=1&enablejsapi=1`
    : "";

  const iframeKey = `${stationIdx}-${activeIdIdx}-${enabled}-${refreshKey}`;

  const handleRefresh = () => {
    const next = (activeIdIdx + 1) % station.ids.length;
    setIdxOverride((prev) => {
      const updated = [...prev];
      updated[stationIdx] = next;
      return updated;
    });
    setRefreshKey((k) => k + 1);
  };

  const handleStationChange = (i: number) => {
    setStationIdx(i);
  };

  return (
    <>
      {/* Floating toggle button in navbar */}
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
        title={enabled ? "Music playing — click to toggle" : "Play background music"}
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

      {/* Expanded player panel */}
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
                onClick={handleRefresh}
                className="p-1 rounded text-muted-foreground hover:text-yellow-400 transition-colors"
                title={`Switch to backup link (${activeIdIdx === 0 ? "backup" : "primary"})`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
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
                title="Minimize"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEnabled(false)}
                className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Station selector */}
          <div className="flex gap-1 px-3 pt-2">
            {STATIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleStationChange(i)}
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
          <div className="relative mt-2 mx-3 mb-1 rounded-lg overflow-hidden aspect-video bg-black border border-primary/10">
            {enabled && (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={src}
                className="w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`${station.label} background music`}
              />
            )}
          </div>

          {/* Now playing + refresh hint */}
          <div className="px-3 pb-3 pt-1 flex items-center justify-between">
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
            {activeIdIdx > 0 && (
              <span className="text-[9px] text-yellow-400/70 font-mono">backup link</span>
            )}
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
