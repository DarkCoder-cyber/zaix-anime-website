import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Eye, BookCheck, Clock, XCircle, Star, User, Calendar, ArrowLeft, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LevelBadge, computeLevelData, getLevelTier } from "@/components/level-badge";
import { AdminCrown } from "@/components/admin-badge";
import { isAdminUsername } from "@/hooks/use-admin";

interface ProfileData {
  user: { id: number; username: string; totalXp: number; createdAt: string };
  stats: { totalWatching: number; totalCompleted: number; totalPlanToWatch: number; totalDropped: number; totalReviews: number };
  currentlyWatching: any[];
  completed: any[];
  planToWatch: any[];
  allWatchlist: any[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  watching: { label: "Watching", icon: <Eye className="w-3.5 h-3.5" />, color: "text-primary", bg: "bg-primary/10 border-primary/30" },
  completed: { label: "Completed", icon: <BookCheck className="w-3.5 h-3.5" />, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  plan_to_watch: { label: "Plan to Watch", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  dropped: { label: "Dropped", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
};

function ContentCard({ item }: { item: any }) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.watching;
  const href = item.contentType === "anime" ? `/watch/${item.contentId}` : `/manga/${item.contentId}`;
  return (
    <Link href={href}>
      <div className="group flex gap-3 p-2 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
        <div className="w-12 h-16 rounded-lg overflow-hidden bg-secondary shrink-0">
          {item.contentImage ? (
            <img src={item.contentImage} alt={item.contentTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1 py-1">
          <p className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.contentTitle}</p>
          <Badge variant="outline" className={`text-[10px] w-fit flex items-center gap-1 ${cfg.bg} ${cfg.color} border`}>
            {cfg.icon}<span>{cfg.label}</span>
          </Badge>
          {item.contentGenres && (
            <p className="text-[10px] text-muted-foreground line-clamp-1">{item.contentGenres.split(",").slice(0, 3).join(", ")}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"watching" | "completed" | "plan" | "all">("watching");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}/profile`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setProfile(data); setLoading(false); })
      .catch(err => { setError(err === 404 ? "User not found" : "Failed to load profile"); setLoading(false); });
  }, [username]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center pt-20">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-20 text-center p-8">
      <User className="w-16 h-16 text-primary/20 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">{error || "Profile not found"}</h2>
      <button onClick={() => setLocation("/")} className="text-primary hover:underline text-sm mt-2">← Back to Home</button>
    </div>
  );

  const { user, stats, currentlyWatching, completed, planToWatch, allWatchlist } = profile;
  const tabs = [
    { key: "watching" as const, label: "Watching", count: stats.totalWatching, color: "text-primary" },
    { key: "completed" as const, label: "Completed", count: stats.totalCompleted, color: "text-blue-400" },
    { key: "plan" as const, label: "Plan to Watch", count: stats.totalPlanToWatch, color: "text-yellow-400" },
    { key: "all" as const, label: "All", count: allWatchlist.length, color: "text-white" },
  ];
  const displayItems = activeTab === "watching" ? currentlyWatching : activeTab === "completed" ? completed : activeTab === "plan" ? planToWatch : allWatchlist;

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Profile header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(57,255,20,0.4) 0%, transparent 60%)" }} />
          <div className="relative flex items-center gap-5 flex-wrap">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/40 flex items-center justify-center shadow-neon shrink-0 relative">
              <span className="text-4xl">🎌</span>
              {!isAdminUsername(user.username) && computeLevelData(user.totalXp ?? 0).level > 0 && (
                <div className="absolute -bottom-2 -right-2">
                  <LevelBadge level={computeLevelData(user.totalXp ?? 0).level} size="xs" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-black font-heading text-white">{user.username}</h1>
                {isAdminUsername(user.username)
                  ? <AdminCrown size="md" />
                  : <LevelBadge level={computeLevelData(user.totalXp ?? 0).level} size="md" showLabel />
                }
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              </div>
              {!isAdminUsername(user.username) && (() => {
                const xpData = computeLevelData(user.totalXp ?? 0);
                const tier = getLevelTier(xpData.level);
                return (
                  <div className="mt-1 max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Zap className="w-3 h-3 text-primary" />
                        {xpData.totalXp.toLocaleString()} XP
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {xpData.nextLevelXp.toLocaleString()} XP → Lv.{xpData.level + 1}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${xpData.progressPct}%`,
                          background: tier
                            ? `linear-gradient(90deg, ${tier.color.includes("amber") ? "#b45309,#d97706" : tier.color.includes("slate") ? "#94a3b8,#cbd5e1" : tier.color.includes("cyan") ? "#06b6d4,#22d3ee" : "#fb923c,#f97316"})`
                            : "linear-gradient(90deg, #39ff14, #00ff88)",
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {xpData.progressXp.toLocaleString()} / {xpData.rangeXp.toLocaleString()} XP to next level
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            <StatBox label="Watching" value={stats.totalWatching} color="text-primary" />
            <StatBox label="Completed" value={stats.totalCompleted} color="text-blue-400" />
            <StatBox label="Plan to Watch" value={stats.totalPlanToWatch} color="text-yellow-400" />
            <StatBox label="Dropped" value={stats.totalDropped} color="text-red-400" />
            <StatBox label="Reviews" value={stats.totalReviews} color="text-white" icon={<Star className="w-4 h-4" />} />
          </div>
        </div>

        {/* Currently Watching highlight */}
        {currentlyWatching.length > 0 && (
          <div className="bg-card border border-primary/30 rounded-2xl p-5 mb-6 shadow-neon">
            <h2 className="text-lg font-bold font-heading text-white mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Currently Watching
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentlyWatching.slice(0, 6).map(item => <ContentCard key={item.id} item={item} />)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key ? `${tab.color} border-b-2 border-current bg-primary/5` : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? "bg-current/20" : "bg-secondary"} text-current`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="p-5">
            {displayItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="w-10 h-10 mx-auto mb-3 text-primary/20" />
                <p className="text-sm">Nothing here yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayItems.map(item => <ContentCard key={item.id} item={item} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-background/50 border border-border rounded-xl px-4 py-3 text-center">
      <div className={`text-2xl font-black font-heading ${color} flex items-center justify-center gap-1`}>
        {icon}{value}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
