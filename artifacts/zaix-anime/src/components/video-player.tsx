import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";

export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

interface VideoPlayerProps {
  sources: StreamSource[];
  headers?: Record<string, string>;
  posterUrl?: string;
}

export function VideoPlayer({ sources, posterUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");

  // Default to the selected quality, or 'auto', or the first source
  const currentSource = sources.find(s => s.quality === selectedQuality) 
    || sources.find(s => s.quality === "auto") 
    || sources[0];

  useEffect(() => {
    // initialize selected quality once sources are loaded
    if (!sources.length) return;
    
    if (!selectedQuality || (!sources.find(s => s.quality === selectedQuality) && selectedQuality !== "auto")) {
      const autoSource = sources.find(s => s.quality === "auto");
      setSelectedQuality(autoSource ? "auto" : sources[0].quality);
    }
  }, [sources, selectedQuality]);

  useEffect(() => {
    if (!videoRef.current || !currentSource) return;

    const videoEl = videoRef.current;
    
    // Cleanup previous hls instance
    let hls: Hls | null = null;

    if (Hls.isSupported() && currentSource.isM3U8) {
      hls = new Hls({
        // Hls.js configuration could go here
      });
      hls.loadSource(currentSource.url);
      hls.attachMedia(videoEl);
    } else {
      videoEl.src = currentSource.url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSource]);

  if (!sources || sources.length === 0) {
    return (
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon flex items-center justify-center">
        <p className="text-white/50 font-medium text-lg">No video sources available</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon group">
      <video
        ref={videoRef}
        controls
        poster={posterUrl}
        className="w-full h-full object-contain"
        crossOrigin="anonymous"
      />
      
      {/* Custom Quality Selector Overlay */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-black/60 hover:bg-black/80 backdrop-blur-sm border border-white/20 text-white rounded-md px-3 py-1.5 flex items-center gap-2 transition-colors text-sm font-medium">
              <Settings className="w-4 h-4" />
              <span>{selectedQuality}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-md border-primary/30 min-w-[120px]">
            {sources.map(source => (
              <DropdownMenuItem 
                key={source.quality} 
                onClick={() => setSelectedQuality(source.quality)}
                className={`cursor-pointer hover:bg-primary/20 ${selectedQuality === source.quality ? 'text-primary focus:text-primary bg-primary/10' : 'text-foreground'}`}
              >
                {source.quality} 
                {(source.quality === '1080p' || source.quality === 'auto') && <Badge className="ml-auto text-[10px] h-4 bg-primary/20 text-primary border-0">HD</Badge>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
