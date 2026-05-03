import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, BellRing, Check, CheckCheck, Trash2, BookOpen, Tv, Info, Zap } from "lucide-react";
import { useNotifications, type AppNotification } from "@/hooks/use-local-store";
import { useAuth } from "@/hooks/use-auth";

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
  if (type === "system") return <Zap className="w-4 h-4 text-yellow-400 shrink-0" />;
  return <Info className="w-4 h-4 text-muted-foreground shrink-0" />;
}

function useDbNotifications(isLoggedIn: boolean) {
  const [dbNotifs, setDbNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const token = () => localStorage.getItem("zaix_token");

  const fetchNotifs = useCallback(async () => {
    if (!isLoggedIn || !token()) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbNotifs(
        (data.notifications ?? []).map((n: any) => ({
          id: String(n.id),
          title: n.title,
          message: n.message,
          type: n.type as AppNotification["type"],
          read: n.read,
          createdAt: n.createdAt,
        }))
      );
    } catch {} finally { setLoading(false); }
  }, [isLoggedIn]);

  const markRead = useCallback(async (id: string) => {
    if (!token()) return;
    setDbNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    if (!token()) return;
    setDbNotifs(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
    } catch {}
  }, []);

  const clearAll = useCallback(async () => {
    if (!token()) return;
    setDbNotifs([]);
    try {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
    } catch {}
  }, []);

  const addNotification = useCallback(async (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
    if (!token()) return;
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(n),
      });
      if (!res.ok) return;
      const inserted = await res.json();
      setDbNotifs(prev => [{
        id: String(inserted.id),
        title: inserted.title,
        message: inserted.message,
        type: inserted.type,
        read: inserted.read,
        createdAt: inserted.createdAt,
      }, ...prev].slice(0, 50));
    } catch {}
  }, []);

  return { dbNotifs, loading, fetchNotifs, markRead, markAllRead, clearAll, addNotification };
}

const EPISODE_CHECK_KEY = "zaix_ep_counts";
const EPISODE_CHECK_SESSION = "zaix_ep_checked";

function useEpisodeNotifications(
  isLoggedIn: boolean,
  addDb: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => Promise<void>,
  addLocal: (n: Omit<AppNotification, "id" | "read" | "createdAt">) => void
) {
  useEffect(() => {
    if (sessionStorage.getItem(EPISODE_CHECK_SESSION)) return;
    sessionStorage.setItem(EPISODE_CHECK_SESSION, "1");

    const run = async () => {
      const token = localStorage.getItem("zaix_token");
      if (!token) return;
      try {
        const res = await fetch("/api/watchlist", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const { items } = await res.json();
        const animeItems = (items ?? []).filter((i: any) => i.contentType === "anime").slice(0, 4);
        if (!animeItems.length) return;

        const stored: Record<string, number> = JSON.parse(localStorage.getItem(EPISODE_CHECK_KEY) ?? "{}");
        const updated: Record<string, number> = { ...stored };
        const promises = animeItems.map(async (item: any) => {
          try {
            const r = await fetch(`/api/anime/${item.contentId}/episodes`);
            if (!r.ok) return;
            const d = await r.json();
            const count: number = d?.data?.length ?? d?.pagination?.items?.total ?? 0;
            if (!count) return;
            const prev = stored[item.contentId];
            updated[item.contentId] = count;
            if (prev !== undefined && count > prev) {
              const msg = {
                type: "new_episode" as const,
                title: `New Episode Available!`,
                message: `${item.contentTitle} has ${count - prev} new episode${count - prev > 1 ? "s" : ""}.`,
                animeId: item.contentId,
              };
              if (isLoggedIn) {
                await addDb(msg);
              } else {
                addLocal(msg);
              }
            }
          } catch {}
        });
        await Promise.all(promises);
        localStorage.setItem(EPISODE_CHECK_KEY, JSON.stringify(updated));
      } catch {}
    };
    run();
  }, [isLoggedIn, addDb, addLocal]);
}

export function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const { notifications: localNotifs, unreadCount: localUnread, markRead: markLocalRead,
    markAllRead: markLocalAllRead, clearAll: clearLocal, addNotification: addLocal } = useNotifications();
  const { dbNotifs, loading, fetchNotifs, markRead: markDbRead, markAllRead: markDbAllRead,
    clearAll: clearDb, addNotification: addDb } = useDbNotifications(isLoggedIn);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoggedIn) fetchNotifs();
  }, [isLoggedIn, fetchNotifs]);

  useEffect(() => {
    if (!isLoggedIn) {
      const seeded = localStorage.getItem("zaix_notif_seeded");
      if (!seeded) {
        addLocal({ type: "system", title: "Welcome to Zaix Anime! 🎌", message: "Save anime to your library. Get notified when new content drops." });
        localStorage.setItem("zaix_notif_seeded", "1");
      }
    }
  }, [isLoggedIn, addLocal]);

  useEpisodeNotifications(isLoggedIn, addDb, addLocal);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifications = isLoggedIn ? dbNotifs : localNotifs;
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    if (isLoggedIn) markDbRead(id);
    else markLocalRead(id);
  };
  const handleMarkAllRead = () => {
    if (isLoggedIn) markDbAllRead();
    else markLocalAllRead();
  };
  const handleClearAll = () => {
    if (isLoggedIn) clearDb();
    else clearLocal();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(o => !o); if (!open && isLoggedIn) fetchNotifs(); }}
        className="relative p-2 rounded-lg text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors active:scale-95"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-primary animate-[wiggle_1s_ease-in-out_infinite]" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-neon animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 backdrop-blur-xl border border-primary/30 rounded-xl shadow-neon-intense z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px) saturate(180%)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Notifications
              {unreadCount > 0 && (
                <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {unreadCount} new
                </span>
              )}
            </h3>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Mark all read">
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Clear all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="px-4 py-6 flex flex-col items-center gap-2 text-muted-foreground text-sm">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading notifications…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 text-primary/20" />
                <p>No notifications yet</p>
                <p className="text-xs mt-1 text-muted-foreground/60">
                  {isLoggedIn ? "Add anime to your watchlist to get notified!" : "Log in to get real-time alerts"}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-primary/10 last:border-0 flex gap-3 transition-colors ${n.read ? "opacity-50" : "hover:bg-primary/5"}`}
                >
                  <div className="mt-0.5"><NotifIcon type={n.type} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white line-clamp-1">{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1 shadow-neon animate-pulse" />}
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
