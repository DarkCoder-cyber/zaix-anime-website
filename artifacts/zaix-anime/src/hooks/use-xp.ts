import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { computeLevel, getLevelTier } from "@/components/level-badge";

interface XpData {
  totalXp: number;
  level: number;
  progressPct: number;
  progressXp: number;
  rangeXp: number;
  nextLevelXp: number;
}

export function useXp(isLoggedIn: boolean) {
  const [xpData, setXpData] = useState<XpData>({
    totalXp: 0, level: 0, progressPct: 0,
    progressXp: 0, rangeXp: 100, nextLevelXp: 100,
  });
  const prevLevelRef = useRef(-1);
  const initializedRef = useRef(false);

  const fetchXp = useCallback(async () => {
    const token = localStorage.getItem("zaix_token");
    if (!token) return;
    try {
      const res = await fetch("/api/xp", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setXpData(data);
    } catch { }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) { prevLevelRef.current = -1; initializedRef.current = false; return; }
    fetchXp();
  }, [isLoggedIn, fetchXp]);

  const level = xpData.level;

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!initializedRef.current) {
      prevLevelRef.current = level;
      initializedRef.current = true;
      return;
    }
    if (level > prevLevelRef.current && prevLevelRef.current >= 0) {
      const tier = getLevelTier(level);
      toast.success(
        `${tier?.emoji ?? "⚡"} Level Up! You're now Level ${level}`,
        {
          description: `${tier?.label ?? ""} rank achieved! Keep watching to earn more XP.`,
          duration: 5000,
          style: {
            background: "rgba(0,0,0,0.95)",
            border: `1px solid ${level > 60 ? "rgba(251,146,60,0.6)" : level > 30 ? "rgba(34,211,238,0.6)" : level > 10 ? "rgba(203,213,225,0.6)" : "rgba(180,83,9,0.6)"}`,
            boxShadow: `0 0 20px ${level > 60 ? "rgba(251,146,60,0.3)" : level > 30 ? "rgba(34,211,238,0.3)" : "rgba(168,85,247,0.2)"}`,
          },
        }
      );
    }
    prevLevelRef.current = level;
  }, [level, isLoggedIn]);

  const awardXp = useCallback(async (amount: number) => {
    const token = localStorage.getItem("zaix_token");
    if (!token) return;
    try {
      const res = await fetch("/api/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setXpData(data);
    } catch { }
  }, []);

  return { ...xpData, awardXp, refetchXp: fetchXp };
}
