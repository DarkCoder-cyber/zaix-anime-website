import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { AdminCrown, VerifiedAdminBadge } from "@/components/admin-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Shield, Users, Trash2, Ban, TrendingUp, Flame, Search,
  LogOut, Eye, EyeOff, X, RefreshCw, Crown, CheckCircle
} from "lucide-react";

type Tab = "reviews" | "users" | "trending";

interface Review {
  id: number;
  contentType: string;
  contentId: string;
  userName: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LoginScreen({ onLogin }: { onLogin: (pw: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(password);
    if (!ok) {
      setError("Wrong password. Access denied.");
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm bg-black border rounded-2xl p-8 flex flex-col gap-6 transition-all ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        style={{ borderColor: "rgba(255,215,0,0.4)", boxShadow: "0 0 40px rgba(255,215,0,0.15)" }}
      >
        <div className="text-center flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))", border: "1px solid rgba(255,215,0,0.4)" }}
          >
            <Crown className="w-8 h-8" style={{ color: "#FFD700", filter: "drop-shadow(0 0 8px #FFD70088)" }} />
          </div>
          <h1 className="font-heading font-black text-2xl text-white">Admin Access</h1>
          <p className="text-muted-foreground text-sm">Enter the admin password to continue</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Admin password"
              autoFocus
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-yellow-500/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button
            type="submit"
            className="w-full font-bold text-black"
            style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}
          >
            <Shield className="w-4 h-4 mr-2" /> Enter Admin Panel
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/50">
          ZAIX Admin Panel — Authorized Access Only
        </p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { authenticated, bannedUsers, trendingTags, login, logout, banUser, unbanUser, isBanned, addTrendingTag, removeTrendingTag } = useAdmin();
  const [tab, setTab] = useState<Tab>("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [animeSearch, setAnimeSearch] = useState("");
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [searchingAnime, setSearchingAnime] = useState(false);
  const [banInput, setBanInput] = useState("");

  const fetchAllReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const contentIds = ["21", "1735", "51009", "20", "40748", "5114", "41467"];
      const types = ["anime", "manga"];
      const all: Review[] = [];
      await Promise.all(
        contentIds.flatMap(id =>
          types.map(async (type) => {
            try {
              const res = await fetch(`/api/reviews/${type}/${id}`);
              if (!res.ok) return;
              const data = await res.json();
              all.push(...(data.reviews || []));
            } catch {}
          })
        )
      );
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(all);
    } catch {
      toast.error("Failed to fetch reviews");
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated && tab === "reviews") {
      fetchAllReviews();
    }
  }, [authenticated, tab, fetchAllReviews]);

  const deleteReview = async (review: Review) => {
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setReviews(prev => prev.filter(r => r.id !== review.id));
      toast.success("Review deleted");
    } catch {
      toast.error("Could not delete review");
    }
  };

  const searchAnime = async (q: string) => {
    if (!q.trim() || q.length < 2) { setAnimeResults([]); return; }
    setSearchingAnime(true);
    try {
      const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setAnimeResults(data.data ?? []);
    } catch { setAnimeResults([]); }
    finally { setSearchingAnime(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => searchAnime(animeSearch), 400);
    return () => clearTimeout(t);
  }, [animeSearch]);

  if (!authenticated) return <LoginScreen onLogin={login} />;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "reviews", label: "Reviews", icon: <Trash2 className="w-4 h-4" /> },
    { key: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { key: "trending", label: "Trending Tags", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", boxShadow: "0 0 15px rgba(255,215,0,0.2)" }}
          >
            <Crown className="w-5 h-5" style={{ color: "#FFD700" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black font-heading text-white">Admin Panel</h1>
              <VerifiedAdminBadge />
            </div>
            <p className="text-muted-foreground text-sm">ZAIX Content Management — Full Control</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
            onClick={() => { logout(); toast.success("Logged out"); }}
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total Reviews", value: reviews.length, icon: "📝" },
            { label: "Banned Users", value: bannedUsers.length, icon: "🚫" },
            { label: "Tagged Anime", value: Object.keys(trendingTags).length, icon: "📈" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? "text-black font-bold"
                  : "text-muted-foreground hover:text-white"
              }`}
              style={tab === t.key ? { background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 15px rgba(255,215,0,0.3)" } : {}}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Reviews Tab */}
        {tab === "reviews" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" /> Manage Reviews
              </h2>
              <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={fetchAllReviews}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>

            {reviewsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reviews found across common content IDs.</p>
                <p className="text-xs mt-1">Reviews populate as users visit anime/manga pages.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reviews.map((r) => (
                  <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white flex items-center gap-1.5">
                          {r.userName.toLowerCase() === "zaix" && <AdminCrown size="xs" />}
                          {r.userName}
                        </span>
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground px-1.5">
                          {r.contentType} #{r.contentId}
                        </Badge>
                        <span className="text-xs text-primary">★ {r.rating}/5</span>
                        {isBanned(r.userName) && (
                          <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-400 bg-red-500/10 px-1.5">BANNED</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            if (isBanned(r.userName)) { unbanUser(r.userName); toast.success(`Unbanned ${r.userName}`); }
                            else { banUser(r.userName); toast.success(`Banned ${r.userName}`); }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                            isBanned(r.userName)
                              ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                              : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                          }`}
                        >
                          <Ban className="w-3 h-3 inline mr-1" />
                          {isBanned(r.userName) ? "Unban" : "Ban"}
                        </button>
                        <button
                          onClick={() => deleteReview(r)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                    {r.reviewText && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.reviewText}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60">{timeAgo(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users (Ban) Tab */}
        {tab === "users" && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-orange-400" /> Ban / Unban Users
            </h2>

            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Enter a username to ban them from submitting reviews and appearing in content.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={banInput}
                  onChange={(e) => setBanInput(e.target.value)}
                  placeholder="Username to ban..."
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && banInput.trim()) {
                      banUser(banInput.trim());
                      toast.success(`Banned "${banInput.trim()}"`);
                      setBanInput("");
                    }
                  }}
                />
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0"
                  disabled={!banInput.trim()}
                  onClick={() => {
                    banUser(banInput.trim());
                    toast.success(`Banned "${banInput.trim()}"`);
                    setBanInput("");
                  }}
                >
                  <Ban className="w-4 h-4 mr-1.5" /> Ban
                </Button>
              </div>
            </div>

            {bannedUsers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                <p>No banned users. Community is clean!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {bannedUsers.map((u) => (
                  <div key={u} className="bg-card border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <Ban className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="font-bold text-white text-sm">{u}</span>
                      <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-400 bg-red-500/10">BANNED</Badge>
                    </div>
                    <button
                      onClick={() => { unbanUser(u); toast.success(`Unbanned ${u}`); }}
                      className="text-xs font-semibold text-green-400 hover:text-green-300 border border-green-500/30 hover:bg-green-500/10 px-3 py-1 rounded-lg transition-all"
                    >
                      <X className="w-3 h-3 inline mr-1" /> Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trending Tags Tab */}
        {tab === "trending" && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Manage Trending / Hot Tags
            </h2>
            <p className="text-sm text-muted-foreground">Search for an anime and apply a Trending or Hot tag. These appear as badges on anime cards across the site.</p>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={animeSearch}
                onChange={(e) => setAnimeSearch(e.target.value)}
                placeholder="Search anime to tag..."
                className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {searchingAnime && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}

            {animeResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {animeResults.map((anime) => {
                  const tag = trendingTags[String(anime.malId)];
                  return (
                    <div key={anime.malId} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                      {anime.image && <img src={anime.image} alt={anime.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm line-clamp-1">{anime.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {tag ? (
                            <>
                              {tag.tag === "hot" ? (
                                <span className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">🔥 HOT</span>
                              ) : (
                                <span className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded">📈 TRENDING</span>
                              )}
                              <button onClick={() => { removeTrendingTag(String(anime.malId)); toast.success("Tag removed"); }} className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors">
                                <X className="w-3 h-3 inline" /> Remove
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No tag</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { addTrendingTag(String(anime.malId), "trending"); toast.success(`📈 Tagged "${anime.title}" as Trending`); }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
                        >
                          <TrendingUp className="w-3 h-3" /> Trending
                        </button>
                        <button
                          onClick={() => { addTrendingTag(String(anime.malId), "hot"); toast.success(`🔥 Tagged "${anime.title}" as Hot`); }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1"
                        >
                          <Flame className="w-3 h-3" /> Hot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Current tags */}
            {Object.keys(trendingTags).length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Currently Tagged</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(trendingTags).map(([id, t]) => (
                    <div key={id} className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {t.tag === "hot" ? (
                          <span className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded">🔥 HOT</span>
                        ) : (
                          <span className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded">📈 TRENDING</span>
                        )}
                        <span className="text-sm text-muted-foreground font-mono">ID: {id}</span>
                      </div>
                      <button
                        onClick={() => { removeTrendingTag(id); toast.success("Tag removed"); }}
                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
