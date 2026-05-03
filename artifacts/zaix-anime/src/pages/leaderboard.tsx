import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Trophy, Zap, Star, BookOpen, ArrowLeft, Loader2, Crown } from "lucide-react";
import { LevelBadge, computeLevelData, getLevelTier } from "@/components/level-badge";
import { AdminCrown } from "@/components/admin-badge";
import { isAdminUsername } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

interface LeaderboardEntry {
  rank: number;
  username: string;
  totalXp: number;
  level: number;
  reviewCount: number;
  watchlistCount: number;
  memberSince: string;
}

const RANK_STYLES: Record<number, { glow: string; border: string; bg: string; icon: string }> = {
  1: { glow: "0 0 30px rgba(255,215,0,0.5)", border: "rgba(255,215,0,0.6)", bg: "rgba(255,215,0,0.07)", icon: "🥇" },
  2: { glow: "0 0 20px rgba(192,192,192,0.4)", border: "rgba(192,192,192,0.5)", bg: "rgba(192,192,192,0.05)", icon: "🥈" },
  3: { glow: "0 0 20px rgba(205,127,50,0.4)", border: "rgba(205,127,50,0.5)", bg: "rgba(205,127,50,0.05)", icon: "🥉" },
};

function RankNumber({ rank }: { rank: number }) {
  if (rank <= 3) {
    return <span className="text-xl font-black">{RANK_STYLES[rank].icon}</span>;
  }
  return (
    <span className="w-8 text-center text-sm font-bold text-muted-foreground">
      #{rank}
    </span>
  );
}

function XpBar({ totalXp }: { totalXp: number }) {
  const { progressPct, level } = computeLevelData(totalXp);
  const tier = getLevelTier(level);
  if (level === 0) return null;
  return (
    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${progressPct}%`,
          background: tier
            ? tier.color.includes("amber")
              ? "linear-gradient(90deg,#b45309,#d97706)"
              : tier.color.includes("slate")
              ? "linear-gradient(90deg,#94a3b8,#cbd5e1)"
              : tier.color.includes("cyan")
              ? "linear-gradient(90deg,#06b6d4,#22d3ee)"
              : "linear-gradient(90deg,#fb923c,#f97316)"
            : "linear-gradient(90deg,#39ff14,#00ff88)",
        }}
      />
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/leaderboard?limit=50")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setEntries(data.leaderboard ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load leaderboard"); setLoading(false); });
  }, []);

  const myEntry = user ? entries.find(e => e.username === user.username) : null;

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)", border: "1px solid rgba(255,215,0,0.4)", boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}>
              <Trophy className="w-6 h-6" style={{ color: "#FFD700" }} />
            </div>
            <div>
              <h1 className="text-3xl font-black font-heading text-white">XP Leaderboard</h1>
              <p className="text-muted-foreground text-sm">Top members ranked by XP earned</p>
            </div>
          </div>
        </div>

        {/* My rank banner (if logged in and on leaderboard) */}
        {myEntry && (
          <div className="mb-6 p-4 rounded-xl border flex items-center gap-4"
            style={{ background: "rgba(57,255,20,0.04)", borderColor: "rgba(57,255,20,0.3)", boxShadow: "0 0 14px rgba(57,255,20,0.08)" }}>
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-lg font-black text-primary">#{myEntry.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">Your rank</span>
                <LevelBadge level={myEntry.level} size="xs" />
              </div>
              <p className="text-xs text-muted-foreground">{myEntry.totalXp.toLocaleString()} XP — Level {myEntry.level}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-24 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary/20" />
            <p>{error}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-primary/20" />
            <p className="text-sm">No one on the leaderboard yet. Start watching to earn XP!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
                  const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                  const style = RANK_STYLES[actualRank];
                  const tier = getLevelTier(entry.level);
                  const isMe = user?.username === entry.username;
                  return (
                    <Link key={entry.username} href={`/profile/${entry.username}`}>
                      <div
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border cursor-pointer transition-transform hover:scale-[1.02] ${podiumIdx === 1 ? "pt-6 pb-6" : "pt-4 pb-4"}`}
                        style={{ background: style.bg, borderColor: style.border, boxShadow: style.glow }}
                      >
                        <span className="text-2xl">{style.icon}</span>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black"
                          style={{ background: `${style.bg}`, border: `2px solid ${style.border}` }}>
                          {entry.username[0].toUpperCase()}
                        </div>
                        <div className="text-center min-w-0 w-full">
                          <p className="text-sm font-bold text-white truncate">{isAdminUsername(entry.username) ? "zaix" : entry.username}</p>
                          {isAdminUsername(entry.username)
                            ? <AdminCrown size="sm" className="mx-auto mt-0.5" />
                            : entry.level > 0 && <LevelBadge level={entry.level} size="xs" />
                          }
                          <div className="flex items-center justify-center gap-1 mt-1.5">
                            <Zap className="w-3 h-3 text-primary" />
                            <span className="text-xs font-bold text-primary">{entry.totalXp.toLocaleString()}</span>
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

            {/* Full list */}
            {entries.map((entry) => {
              const topStyle = RANK_STYLES[entry.rank];
              const isMe = user?.username === entry.username;
              const isAdmin = isAdminUsername(entry.username);
              return (
                <Link key={entry.username} href={`/profile/${entry.username}`}>
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5"
                    style={topStyle
                      ? { background: topStyle.bg, borderColor: topStyle.border, boxShadow: topStyle.glow }
                      : isMe
                      ? { background: "rgba(57,255,20,0.04)", borderColor: "rgba(57,255,20,0.3)" }
                      : { borderColor: "rgba(255,255,255,0.06)" }
                    }
                  >
                    {/* Rank */}
                    <div className="w-10 shrink-0 flex items-center justify-center">
                      <RankNumber rank={entry.rank} />
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-black text-base shrink-0"
                      style={isAdmin
                        ? { background: "rgba(255,215,0,0.15)", border: "2px solid rgba(255,215,0,0.5)" }
                        : topStyle
                        ? { background: topStyle.bg, border: `2px solid ${topStyle.border}` }
                        : { background: "rgba(57,255,20,0.08)", border: "1px solid rgba(57,255,20,0.2)" }
                      }
                    >
                      {isAdmin ? (
                        <AdminCrown size="sm" />
                      ) : (
                        <span className="text-white">{entry.username[0].toUpperCase()}</span>
                      )}
                    </div>

                    {/* Name + badge + XP bar */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-bold text-sm"
                          style={isAdmin ? { color: "#FFD700" } : { color: "white" }}
                        >
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
                      <XpBar totalXp={entry.totalXp} />
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-black text-primary">{entry.totalXp.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">XP</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5" />{entry.reviewCount}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <BookOpen className="w-2.5 h-2.5" />{entry.watchlistCount}
                        </span>
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
