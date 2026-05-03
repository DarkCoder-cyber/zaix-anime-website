import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Check, CheckCheck, Trash2, BookOpen, Tv, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type AppNotification } from "@/hooks/use-local-store";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "new_chapter") return <BookOpen className="w-4 h-4 text-primary shrink-0" />;
  if (type === "new_episode") return <Tv className="w-4 h-4 text-blue-400 shrink-0" />;
  return <Info className="w-4 h-4 text-yellow-400 shrink-0" />;
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, addNotification } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Seed welcome notification once
  useEffect(() => {
    const seeded = localStorage.getItem("zaix_notif_seeded");
    if (!seeded) {
      addNotification({
        type: "system",
        title: "Welcome to Zaix Anime! 🎌",
        message: "Save anime & manga to your library. Get notified when new content drops.",
      });
      localStorage.setItem("zaix_notif_seeded", "1");
    }
  }, [addNotification]);

  // Simulate periodic new-episode/chapter notifications every 5 min
  useEffect(() => {
    const SAMPLE = [
      { type: "new_episode" as const, title: "New Episode Available", message: "Attack on Titan: Episode 15 is now streaming." },
      { type: "new_chapter" as const, title: "New Chapter Released", message: "Demon Slayer: Chapter 208 has been uploaded." },
      { type: "new_episode" as const, title: "New Episode Available", message: "Jujutsu Kaisen: Episode 23 is ready to watch." },
      { type: "new_chapter" as const, title: "Manhwa Update", message: "Solo Leveling: Chapter 179 is now available." },
    ];
    let idx = 0;
    const id = setInterval(() => {
      addNotification(SAMPLE[idx % SAMPLE.length]);
      idx++;
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [addNotification]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-primary animate-[wiggle_1s_ease-in-out_infinite]" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-neon animate-pulse-glow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-black/95 backdrop-blur-xl border border-primary/30 rounded-xl shadow-neon-intense z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 text-primary/20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-primary/10 last:border-0 flex gap-3 transition-colors ${
                    n.read ? "opacity-50" : "hover:bg-primary/5"
                  }`}
                >
                  <div className="mt-0.5">
                    <NotifIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white line-clamp-1">{n.title}</p>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1 shadow-neon" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.read && <Check className="w-3 h-3 text-primary/40 shrink-0 mt-0.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
