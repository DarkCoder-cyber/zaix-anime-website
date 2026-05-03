import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  username: string;
  bio: string;
  avatar: string;
}

export interface LibraryItem {
  id: string;
  type: "anime" | "manga";
  title: string;
  image: string | null;
  addedAt: string;
}

export interface RecentItem {
  id: string;
  type: "anime" | "manga";
  title: string;
  image: string | null;
  visitedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "new_chapter" | "new_episode" | "system";
  read: boolean;
  createdAt: string;
}

// ─── Core localStorage hook ───────────────────────────────────────────────────

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const newVal = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(newVal));
        } catch {}
        return newVal;
      });
    },
    [key]
  );

  return [value, set] as const;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

const DEFAULT_PROFILE: UserProfile = { username: "Weeb", bio: "", avatar: "🎌" };

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<UserProfile>("zaix_profile", DEFAULT_PROFILE);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => setProfile((p) => ({ ...p, ...updates })),
    [setProfile]
  );

  return { profile, updateProfile };
}

// ─── Library ──────────────────────────────────────────────────────────────────

export function useLibrary() {
  const [library, setLibrary] = useLocalStorage<Record<string, LibraryItem>>("zaix_library", {});

  const addToLibrary = useCallback(
    (item: Omit<LibraryItem, "addedAt">) => {
      setLibrary((prev) => ({
        ...prev,
        [item.id]: { ...item, addedAt: new Date().toISOString() },
      }));
    },
    [setLibrary]
  );

  const removeFromLibrary = useCallback(
    (id: string) => {
      setLibrary((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [setLibrary]
  );

  const isInLibrary = useCallback((id: string) => id in library, [library]);

  const items = Object.values(library).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  return { items, addToLibrary, removeFromLibrary, isInLibrary };
}

// ─── Recently Visited ─────────────────────────────────────────────────────────

export function useRecentlyVisited() {
  const [recent, setRecent] = useLocalStorage<RecentItem[]>("zaix_recent", []);

  const addRecent = useCallback(
    (item: Omit<RecentItem, "visitedAt">) => {
      setRecent((prev) => {
        const filtered = prev.filter((r) => r.id !== item.id);
        return [{ ...item, visitedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
      });
    },
    [setRecent]
  );

  return { recent, addRecent };
}

// ─── Watch Progress ───────────────────────────────────────────────────────────

export interface WatchProgress {
  malId: string;
  title: string;
  image: string | null;
  episode: number;
  watchedSeconds: number;
  totalSeconds: number;
  updatedAt: string;
}

export function useWatchProgress() {
  const [progress, setProgress] = useLocalStorage<Record<string, WatchProgress>>("zaix_progress", {});

  const saveProgress = useCallback(
    (item: Omit<WatchProgress, "updatedAt">) => {
      setProgress((prev) => ({
        ...prev,
        [item.malId]: { ...item, updatedAt: new Date().toISOString() },
      }));
    },
    [setProgress],
  );

  const getProgress = useCallback((malId: string): WatchProgress | null => progress[malId] ?? null, [progress]);

  const clearProgress = useCallback(
    (malId: string) => {
      setProgress((prev) => {
        const next = { ...prev };
        delete next[malId];
        return next;
      });
    },
    [setProgress],
  );

  const allProgress = Object.values(progress).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return { allProgress, saveProgress, getProgress, clearProgress };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useLocalStorage<AppNotification[]>(
    "zaix_notifications",
    []
  );

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "read" | "createdAt">) => {
      const notif: AppNotification = {
        ...n,
        id: Math.random().toString(36).slice(2),
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      return notif;
    },
    [setNotifications]
  );

  const markRead = useCallback(
    (id: string) =>
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [setNotifications]
  );

  const markAllRead = useCallback(
    () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    [setNotifications]
  );

  const clearAll = useCallback(() => setNotifications([]), [setNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, addNotification, markRead, markAllRead, clearAll };
}
