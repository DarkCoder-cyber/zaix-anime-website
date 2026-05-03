import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export type WatchStatus = "watching" | "completed" | "plan_to_watch" | "dropped";

export interface WatchlistItem {
  id: number;
  userId: number;
  contentType: string;
  contentId: string;
  contentTitle: string;
  contentImage: string | null;
  contentGenres: string | null;
  status: WatchStatus;
  createdAt: string;
}

function getToken(): string | null {
  try { return localStorage.getItem("zaix_token"); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return { "Content-Type": "application/json" };
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isLoggedIn = !!getToken();

  const fetchWatchlist = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const checkItem = useCallback(async (contentType: string, contentId: string): Promise<WatchlistItem | null> => {
    if (!getToken()) return null;
    try {
      const res = await fetch(`/api/watchlist/check?contentType=${contentType}&contentId=${contentId}`, { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.item ?? null;
    } catch { return null; }
  }, []);

  const addOrUpdate = useCallback(async (params: {
    contentType: string; contentId: string; contentTitle: string;
    contentImage?: string | null; contentGenres?: string | null; status?: WatchStatus;
  }) => {
    if (!getToken()) return null;
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status: "watching", ...params }),
      });
      if (!res.ok) throw new Error();
      const item: WatchlistItem = await res.json();
      setItems(prev => {
        const exists = prev.findIndex(i => i.contentId === params.contentId && i.contentType === params.contentType);
        if (exists >= 0) {
          const next = [...prev];
          next[exists] = item;
          return next;
        }
        return [item, ...prev];
      });
      return item;
    } catch { return null; }
  }, []);

  const remove = useCallback(async (itemId: number) => {
    if (!getToken()) return;
    try {
      const res = await fetch(`/api/watchlist/${itemId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch { }
  }, []);

  const getItem = useCallback((contentType: string, contentId: string): WatchlistItem | null => {
    return items.find(i => i.contentType === contentType && i.contentId === contentId) ?? null;
  }, [items]);

  const isInWatchlist = useCallback((contentType: string, contentId: string) => {
    return items.some(i => i.contentType === contentType && i.contentId === contentId);
  }, [items]);

  return { items, loading, isLoggedIn, fetchWatchlist, checkItem, addOrUpdate, remove, getItem, isInWatchlist };
}

// Standalone hook for a single item (used in cards)
export function useWatchlistItem(contentType: string, contentId: string) {
  const [item, setItem] = useState<WatchlistItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    fetch(`/api/watchlist/check?contentType=${contentType}&contentId=${contentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : { item: null })
      .then(d => setItem(d.item ?? null))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [contentType, contentId]);

  const save = useCallback(async (params: {
    contentTitle: string; contentImage?: string | null; contentGenres?: string | null; status?: WatchStatus;
  }) => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentType, contentId, status: "watching", ...params }),
      });
      if (!res.ok) throw new Error();
      const saved: WatchlistItem = await res.json();
      setItem(saved);
      return saved;
    } catch { return null; }
  }, [contentType, contentId]);

  const remove = useCallback(async () => {
    if (!item) return;
    const token = getToken();
    if (!token) return;
    try {
      await fetch(`/api/watchlist/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setItem(null);
    } catch { }
  }, [item]);

  const updateStatus = useCallback(async (status: WatchStatus) => {
    if (!item) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentType, contentId, contentTitle: item.contentTitle, status }),
      });
      if (!res.ok) throw new Error();
      const updated: WatchlistItem = await res.json();
      setItem(updated);
    } catch { }
  }, [item, contentType, contentId]);

  return { item, loading, save, remove, updateStatus };
}
