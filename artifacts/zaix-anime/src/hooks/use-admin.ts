import { useState, useCallback } from "react";

const ADMIN_PASSWORD = "darkdevil_300";
const ADMIN_USERNAME = "zaix";
const ADMIN_TOKEN_KEY = "zaix_admin_token";
const ADMIN_AUTH_KEY = "zaix_admin_auth";

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

export function isAdminUsername(username: string) {
  return username.trim().toLowerCase() === ADMIN_USERNAME;
}

export function useAdmin() {
  const [authenticated, setAuthenticated] = useLocalStorage<boolean>(ADMIN_AUTH_KEY, false);
  const [adminToken, setAdminToken] = useLocalStorage<string>(ADMIN_TOKEN_KEY, "");
  const [bannedUsers, setBannedUsers] = useLocalStorage<string[]>("zaix_banned_users", []);
  const [trendingTags, setTrendingTags] = useLocalStorage<Record<string, { tag: "trending" | "hot"; addedAt: string }>>(
    "zaix_trending_tags",
    {}
  );

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/auth/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data?.adminToken) return false;
        setAdminToken(data.adminToken);
        setAuthenticated(true);
        return true;
      } catch {
        return false;
      }
    },
    [setAdminToken, setAuthenticated]
  );

  const logout = useCallback(() => {
    setAuthenticated(false);
    setAdminToken("");
  }, [setAuthenticated, setAdminToken]);

  const banUser = useCallback(
    (username: string) => {
      setBannedUsers((prev) => {
        if (prev.includes(username)) return prev;
        return [...prev, username];
      });
    },
    [setBannedUsers]
  );

  const unbanUser = useCallback(
    (username: string) => setBannedUsers((prev) => prev.filter((u) => u !== username)),
    [setBannedUsers]
  );

  const isBanned = useCallback((username: string) => bannedUsers.includes(username), [bannedUsers]);

  const addTrendingTag = useCallback(
    (malId: string, tag: "trending" | "hot") => {
      setTrendingTags((prev) => ({
        ...prev,
        [malId]: { tag, addedAt: new Date().toISOString() },
      }));
    },
    [setTrendingTags]
  );

  const removeTrendingTag = useCallback(
    (malId: string) => {
      setTrendingTags((prev) => {
        const next = { ...prev };
        delete next[malId];
        return next;
      });
    },
    [setTrendingTags]
  );

  const getTrendingTag = useCallback((malId: string) => trendingTags[malId] ?? null, [trendingTags]);

  return {
    authenticated,
    adminToken,
    bannedUsers,
    trendingTags,
    login,
    logout,
    banUser,
    unbanUser,
    isBanned,
    addTrendingTag,
    removeTrendingTag,
    getTrendingTag,
  };
}

export { ADMIN_USERNAME };
