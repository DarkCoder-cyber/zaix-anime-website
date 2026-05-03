import { useState, useRef, useEffect } from "react";
import { Heart, Check, Plus, Loader2, ChevronDown, Eye, BookCheck, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useWatchlistItem, type WatchStatus } from "@/hooks/use-watchlist";
import { useLibrary } from "@/hooks/use-local-store";
import { useAuth } from "@/hooks/use-auth";

const STATUS_OPTIONS: { value: WatchStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "watching", label: "Watching", icon: <Eye className="w-3.5 h-3.5" />, color: "text-primary" },
  { value: "completed", label: "Completed", icon: <BookCheck className="w-3.5 h-3.5" />, color: "text-blue-400" },
  { value: "plan_to_watch", label: "Plan to Watch", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-400" },
  { value: "dropped", label: "Dropped", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400" },
];

interface WatchlistButtonProps {
  contentType: "anime" | "manga";
  contentId: string;
  contentTitle: string;
  contentImage?: string | null;
  contentGenres?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function WatchlistButton({ contentType, contentId, contentTitle, contentImage, contentGenres, className = "", size = "sm" }: WatchlistButtonProps) {
  const { user } = useAuth();
  const { addToLibrary, removeFromLibrary, isInLibrary } = useLibrary();
  const { item, loading, save, remove, updateStatus } = useWatchlistItem(contentType, contentId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const localSaved = isInLibrary(contentId);

  // Logged-in: DB-backed
  if (user) {
    const currentStatus = item?.status;
    const currentOpt = STATUS_OPTIONS.find(o => o.value === currentStatus);
    const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
    const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";

    const handleMainClick = async (e: React.MouseEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (item) { setOpen(v => !v); return; }
      setSaving(true);
      try {
        await save({ contentTitle, contentImage, contentGenres, status: "watching" });
        toast.success("Added to Watchlist!", { description: `${contentTitle} — Watching` });
      } catch { toast.error("Failed to save"); } finally { setSaving(false); }
    };

    const handleStatus = async (e: React.MouseEvent, status: WatchStatus) => {
      e.preventDefault(); e.stopPropagation();
      setOpen(false);
      if (status === currentStatus) {
        setSaving(true);
        try {
          await remove();
          toast.success("Removed from Watchlist", { description: contentTitle });
        } finally { setSaving(false); }
        return;
      }
      setSaving(true);
      try {
        if (item) {
          await updateStatus(status);
        } else {
          await save({ contentTitle, contentImage, contentGenres, status });
        }
        const opt = STATUS_OPTIONS.find(o => o.value === status);
        toast.success(`Watchlist updated!`, { description: `${contentTitle} — ${opt?.label}` });
      } catch { toast.error("Failed to update"); } finally { setSaving(false); }
    };

    return (
      <div className={`relative flex items-center gap-0 ${className}`} ref={dropdownRef}>
        <button
          onClick={handleMainClick}
          disabled={saving || loading}
          className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-10 ${
            item ? "bg-primary text-black shadow-neon" : "bg-black/70 text-white hover:bg-primary hover:text-black"
          }`}
          title={item ? `${currentOpt?.label || "In Watchlist"} — click to change` : "Add to Watchlist"}
        >
          {saving || loading ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : item ? (
            <Check className={iconSize} />
          ) : (
            <Heart className={iconSize} />
          )}
        </button>
        {item && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v); }}
            className="w-4 h-7 rounded-r-full flex items-center justify-center bg-primary/20 text-primary hover:bg-primary/40 transition-colors -ml-0.5"
          >
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        )}
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-black/95 border border-primary/30 rounded-xl shadow-neon-intense py-1 z-50 min-w-[150px] backdrop-blur-md">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={e => handleStatus(e, opt.value)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-primary/10 transition-colors ${
                  currentStatus === opt.value ? `${opt.color} bg-primary/5` : "text-muted-foreground"
                }`}
              >
                <span className={opt.color}>{opt.icon}</span>
                {opt.label}
                {currentStatus === opt.value && <span className="ml-auto text-[9px] text-primary">✓</span>}
              </button>
            ))}
            <div className="border-t border-border/50 mt-1 pt-1">
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false); remove(); toast.success("Removed from Watchlist"); }}
                className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Guest: localStorage
  const handleLocalToggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (localSaved) {
      removeFromLibrary(contentId);
      toast.success("Removed from library", { description: contentTitle, duration: 2000 });
    } else {
      addToLibrary({ id: contentId, type: contentType, title: contentTitle, image: contentImage ?? "" });
      toast.success("Saved to library! 🎌", { description: contentTitle, duration: 2500 });
    }
  };

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const btnSize = size === "sm" ? "w-7 h-7" : "w-8 h-8";

  return (
    <button
      onClick={handleLocalToggle}
      className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-10 ${
        localSaved ? "bg-primary text-black shadow-neon" : "bg-black/70 text-white hover:bg-primary hover:text-black"
      } ${className}`}
      title={localSaved ? "Remove from library" : "Save to library"}
    >
      {localSaved ? <Check className={iconSize} /> : <Plus className={iconSize} />}
    </button>
  );
}
