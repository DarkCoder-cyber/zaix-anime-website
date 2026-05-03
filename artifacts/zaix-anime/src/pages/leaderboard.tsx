import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Trophy, Zap, Star, BookOpen, ArrowLeft, Loader2, Clock, RotateCcw } from "lucide-react";
import { LevelBadge, computeLevelData, getLevelTier } from "@/components/level-badge";
import { AdminCrown } from "@/components/admin-badge";
import { isAdminUsername } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalXp: number;
  weeklyXp: number;
  xp: number;
  level: number;
  reviewCount: number;
  watchlistCount: number;
  memberSince: string;
}

interface SeasonInfo {
  currentSeason: number;
  lastResetAt: string | null;
  nextResetAt: string;
}

type Period = "alltime" | "weekly";

const RANK_STYLES: Record<number, { glow: string; border: string; bg: string; icon: string }> = {
  1: { glow: "0 0 30px rgba(255,215,0,0.5)", border: "rgba(255,215,0,0.6)", bg: "rgba(255,215,0,0.07)", icon: "🥇" },
  2: { glow: "0 0 20px rgba(192,192,192,0.4)", border: "rgba(192,192,192,0.5)", bg: "rgba(192,192,192,0.05)", icon: "🥈" },
  3: { glow: "0 0 20px rgba(205,127,50,0.4)", border: "rgba(205,127,50,0.5)", bg: "rgba(205,127,50,0.05)", icon: "🥉" },
};

const WEEKLY_RANK_STYLES: Record<number, { glow: string; border: string; bg: string; icon: string }> = {
  1: { glow: "0 0 30px rgba(139,92,246,0.5)", border: "rgba(139,92,246,0.6)", bg: "rgba(139,92,246,0.07)", icon: "🥇" },
  2: { glow: "0 0 20px rgba(99,102,241,0.4)", border: "rgba(99,102,241,0.5)", bg: "rgba(99,102,241,0.05)", icon: "🥈" },
  3: { glow: "0 0 20px rgba(79,70,229,0.4)", border: "rgba(79,70,229,0.5)", bg: "rgba(79,70,229,0.05)", icon: "🥉" },
};

function useCountdown(targetDate: string | null) {
  const [parts, setParts] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setParts({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      const totalSecs = Math.floor(diff / 1000);
      setParts({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return parts;
}

function XpBar({ xp, period }: { xp: number; period: Period }) {
  const { progressPct, level } = computeLevelData(xp);
  const tier = getLevelTier(level);
  if (xp === 0) {
    return (
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full w-0 rounded-full" />
      </div>
    );
  }
  if (period === "weekly") {
    return (
      <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min((xp / 500) * 100, 100)}%`, background: "linear-gradient(90deg,#7c3aed,#8b5cf6)" }} />
      </div>
    );
  }
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${progressPct}%`,
          background: tier
            ? tier.color.includes("amber") ? "linear-gradient(90deg,#b45309,#d97706)"
              : tier.color.includes("slate") ? "linear-gradient(90deg,#94a3b8,#cbd5e1)"
              : tier.color.includes("cyan") ? "linear-gradient(90deg,#06b6d4,#22d3ee)"
              : "linear-gradient(90deg,#fb923c,#f97316)"
            : "linear-gradient(90deg,#39ff14,#00ff88)",
        }} />
    </div>
  );
}

function RankNumber({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-xl font-black">{RANK_STYLES[rank].icon}</span>;
  return <span className="w-8 text-center text-sm font-bold text-muted-foreground">#{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("alltime");

  const countdown = useCountdown(season?.nextResetAt ?? null);

  const fetchLeaderboard = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?limit=50&period=${p}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.leaderboard ?? []);
      if (data.season) setSeason(data.season);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaderboard(period); }, [period, fetchLeaderboard]);

  const myEntry = user ? entries.find(e => e.username === user.username) : null;
  const rankStyles = period === "weekly" ? WEEKLY_RANK_STYLES : RANK_STYLES;
  const accentColor = period === "weekly" ? "#8b5cf6" : "#FFD700";
  const accentRgb = period === "weekly" ? "139,92,246" : "255,215,0";

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-5 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500"
                style={{ background: `radial-gradient(circle, rgba(${accentRgb},0.2) 0%, transparent 70%)`, border: `1px solid rgba(${accentRgb},0.4)`, boxShadow: `0 0 20px rgba(${accentRgb},0.3)` }}>
                <Trophy className="w-6 h-6 transition-colors duration-300" style={{ color: accentColor }} />
              </div>
              <div>
                <h1 className="text-3xl font-black font-heading text-white">XP Leaderboard</h1>
                <p className="text-muted-foreground text-sm">Top members ranked by XP earned</p>
              </div>
            </div>
            {/* Season badge */}
            {season && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold"
                  style={{ background: `rgba(${accentRgb},0.08)`, borderColor: `rgba(${accentRgb},0.35)`, color: accentColor }}>
                  <RotateCcw className="w-3 h-3" />
                  Season {season.currentSeason}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Season countdown */}
        {season && period === "weekly" && (
          <div className="mb-5 p-4 rounded-xl border flex items-center gap-4 flex-wrap"
            style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.25)" }}>
            <Clock className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white mb-1">Season {season.currentSeason} resets in</p>
              <div className="flex items-center gap-3">
                {[
                  { label: "D", value: countdown.days },
                  { label: "H", value: countdown.hours },
                  { label: "M", value: countdown.minutes },
                  { label: "S", value: countdown.seconds },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center">
                    <span className="text-xl font-black text-violet-400 font-mono w-8 text-center tabular-nums">
                      {String(value).padStart(2, "0")}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-bold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">Weekly XP resets every Monday.<br />All-time XP and level badges are permanent.</p>
          </div>
        )}

        {/* Period tabs */}
        <div className="flex rounded-xl overflow-hidden border border-border mb-5 bg-card">
          {(["alltime", "weekly"] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="flex-1 py-2.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={period === p
                ? { background: `rgba(${accentRgb},0.12)`, color: accentColor, borderBottom: `2px solid ${accentColor}` }
                : { color: "rgba(255,255,255,0.45)" }
              }
            >
              {p === "alltime" ? <><Trophy className="w-3.5 h-3.5" /> All Time</> : <><RotateCcw className="w-3.5 h-3.5" /> This Week</>}
            </button>
          ))}
        </div>

        {/* My rank banner */}
        {myEntry && (
          <div className="mb-5 p-4 rounded-xl border flex items-center gap-4 transition-all duration-500"
            style={{ background: `rgba(${accentRgb},0.04)`, borderColor: `rgba(${accentRgb},0.28)`, boxShadow: `0 0 14px rgba(${accentRgb},0.07)` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
              style={{ background: `rgba(${accentRgb},0.1)`, border: `1.5px solid rgba(${accentRgb},0.4)`, color: accentColor }}>
              #{myEntry.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">Your rank this {period === "weekly" ? "week" : "season"}</span>
                <LevelBadge level={myEntry.level} size="xs" />
              </div>
              <p className="text-xs text-muted-foreground">
                {myEntry.xp.toLocaleString()} XP {period === "weekly" ? "this week" : "all time"} · Level {myEntry.level}
              </p>
            </div>
          </div>
        )}

        {/* Leaderboard content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: accentColor }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary/20" />
            <p className="text-sm font-medium">No entries yet.</p>
            <p className="text-xs mt-1">
              {period === "weekly" ? "Watch anime or write a review to earn weekly XP!" : "Be the first on the all-time leaderboard!"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Podium — top 3 */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
                  const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                  const style = rankStyles[actualRank];
                  const isMe = user?.username === entry.username;
                  return (
                    <Link key={entry.username} href={`/profile/${entry.username}`}>
                      <div
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-pointer transition-transform hover:scale-[1.02] ${podiumIdx === 1 ? "pt-6 pb-6" : ""}`}
                        style={{ background: style.bg, borderColor: style.border, boxShadow: style.glow }}
                      >
                        <span className="text-2xl">{style.icon}</span>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
                          style={{ background: style.bg, border: `2px solid ${style.border}` }}>
                          {isAdminUsername(entry.username) ? <AdminCrown size="md" /> : entry.username[0].toUpperCase()}
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="text-sm font-bold text-white truncate">{entry.username}</p>
                          {!isAdminUsername(entry.username) && entry.level > 0 && <LevelBadge level={entry.level} size="xs" />}
                          <div className="flex items-center justify-center gap-1 mt-1.5">
                            <Zap className="w-3 h-3" style={{ color: accentColor }} />
                            <span className="text-xs font-black" style={{ color: accentColor }}>{entry.xp.toLocaleString()}</span>
                          </div>
                        </div>
                        {isMe && (
                          <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(57,255,20,0.2)", border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14" }}>
                            YOU
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Full ranked list */}
            {entries.map((entry) => {
              const topStyle = rankStyles[entry.rank];
              const isMe = user?.username === entry.username;
              const isAdmin = isAdminUsername(entry.username);
              return (
                <Link key={entry.username} href={`/profile/${entry.username}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5"
                    style={topStyle
                      ? { background: topStyle.bg, borderColor: topStyle.border, boxShadow: topStyle.glow }
                      : isMe
                      ? { background: `rgba(${accentRgb},0.04)`, borderColor: `rgba(${accentRgb},0.28)` }
                      : { borderColor: "rgba(255,255,255,0.06)" }
                    }
                  >
                    <div className="w-10 shrink-0 flex items-center justify-center">
                      <RankNumber rank={entry.rank} />
                    </div>

                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base shrink-0"
                      style={isAdmin
                        ? { background: "rgba(255,215,0,0.15)", border: "2px solid rgba(255,215,0,0.5)" }
                        : topStyle
                        ? { background: topStyle.bg, border: `2px solid ${topStyle.border}` }
                        : { background: `rgba(${accentRgb},0.08)`, border: `1px solid rgba(${accentRgb},0.2)` }
                      }
                    >
                      {isAdmin ? <AdminCrown size="sm" /> : <span className="text-white">{entry.username[0].toUpperCase()}</span>}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={isAdmin ? { color: "#FFD700" } : { color: "white" }}>
                          {entry.username}
                        </span>
                        {isAdmin
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700" }}>ADMIN</span>
                          : <LevelBadge level={entry.level} size="xs" />
                        }
                        {isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "rgba(57,255,20,0.15)", border: "1px solid rgba(57,255,20,0.4)", color: "#39ff14" }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <XpBar xp={entry.xp} period={period} />
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span className="text-sm font-black" style={{ color: accentColor }}>{entry.xp.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">XP</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{entry.reviewCount}</span>
                        <span className="flex items-center gap-0.5"><BookOpen className="w-2.5 h-2.5" />{entry.watchlistCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
