import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { AdminCrown, VerifiedAdminBadge } from "@/components/admin-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Shield, Users, Trash2, Ban, TrendingUp, Flame, Search,
  LogOut, Eye, EyeOff, X, RefreshCw, Crown, CheckCircle,
  AlertTriangle, Power, Megaphone, Flag, BarChart3, Bell, Radio,
} from "lucide-react";

type Tab = "analytics" | "alert" | "reviews" | "users" | "trending" | "reports" | "stream_reports";

interface Review {
  id: number; contentType: string; contentId: string;
  userName: string; rating: number; reviewText: string | null; createdAt: string;
}
interface Report {
  id: number; reviewId: number; contentType: string; contentId: string;
  reportedUser: string; reviewText: string | null; reason: string;
  reportedBy: string; status: string; createdAt: string;
}
interface StreamReport {
  id: number; malId: number; animeTitle: string; episode: number;
  provider: string; providerLabel: string; reportedBy: string;
  status: string; createdAt: string;
}
interface Analytics { totalUsers: number; totalReviews: number; }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LoginScreen({ onLogin }: { onLogin: (u: string, p: string) => Promise<boolean> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [, setLocation] = useLocation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onLogin(username, password);
    if (ok) { setLocation("/xadmin"); return; }
    setError("Wrong credentials. Access denied.");
    setShaking(true); setTimeout(() => setShaking(false), 600);
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className={`w-full max-w-sm bg-black border rounded-2xl p-8 flex flex-col gap-6 ${shaking ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        style={{ borderColor: "rgba(255,215,0,0.4)", boxShadow: "0 0 40px rgba(255,215,0,0.15)" }}>
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))", border: "1px solid rgba(255,215,0,0.4)" }}>
            <Crown className="w-8 h-8" style={{ color: "#FFD700", filter: "drop-shadow(0 0 8px #FFD70088)" }} />
          </div>
          <h1 className="font-heading font-black text-2xl text-white">Secret Gate</h1>
          <p className="text-muted-foreground text-sm">Enter the hidden admin credentials</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input type="text" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} placeholder="Username" autoFocus
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500/60 transition-colors" />
          <div className="relative">
            <input type={show ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="Password"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 pr-11 text-white text-sm focus:outline-none focus:border-yellow-500/60 transition-colors" />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <Button type="submit" className="w-full font-bold text-black"
            style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}>
            <Shield className="w-4 h-4 mr-2" /> Enter Admin Panel
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground/50">ZAIX Admin Panel — Authorized Access Only</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const {
    authenticated, bannedUsers, trendingTags, maintenanceMode, setMaintenanceMode,
    login, logout, banUser, unbanUser, isBanned, addTrendingTag, removeTrendingTag,
  } = useAdmin();
  const [tab, setTab] = useState<Tab>("analytics");

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Global Alert
  const [alertMsg, setAlertMsg] = useState("");
  const [activeAlert, setActiveAlert] = useState<{ id: number; message: string } | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Stream Reports
  const [streamReports, setStreamReports] = useState<StreamReport[]>([]);
  const [streamReportsLoading, setStreamReportsLoading] = useState(false);

  // Users/Trending
  const [banInput, setBanInput] = useState("");
  const [animeSearch, setAnimeSearch] = useState("");
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [searchingAnime, setSearchingAnime] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) setAnalytics(await res.json());
    } catch {} finally { setAnalyticsLoading(false); }
  }, []);

  const fetchActiveAlert = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/alert");
      if (res.ok) { const d = await res.json(); setActiveAlert(d.alert); }
    } catch {}
  }, []);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const contentIds = ["21", "1735", "51009", "20", "40748", "5114", "41467"];
      const types = ["anime", "manga"];
      const all: Review[] = [];
      await Promise.all(contentIds.flatMap(id => types.map(async (type) => {
        try {
          const res = await fetch(`/api/reviews/${type}/${id}`);
          if (!res.ok) return;
          const data = await res.json();
          all.push(...(data.reviews || []));
        } catch {}
      })));
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(all);
    } catch { toast.error("Failed to fetch reviews"); }
    finally { setReviewsLoading(false); }
  }, []);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) { const d = await res.json(); setReports(d.reports ?? []); }
    } catch {} finally { setReportsLoading(false); }
  }, []);

  const fetchStreamReports = useCallback(async () => {
    setStreamReportsLoading(true);
    try {
      const res = await fetch("/api/stream-reports");
      if (res.ok) { const d = await res.json(); setStreamReports(d.reports ?? []); }
    } catch {} finally { setStreamReportsLoading(false); }
  }, []);

  const updateStreamReportStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/stream-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setStreamReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(`Marked as ${status}`);
    } catch { toast.error("Failed to update"); }
  };

  const deleteStreamReport = async (id: number) => {
    try {
      await fetch(`/api/stream-reports/${id}`, { method: "DELETE" });
      setStreamReports(prev => prev.filter(r => r.id !== id));
      toast.success("Report removed");
    } catch { toast.error("Failed to delete"); }
  };

  useEffect(() => {
    if (!authenticated) return;
    fetchAnalytics();
    fetchActiveAlert();
  }, [authenticated, fetchAnalytics, fetchActiveAlert]);

  useEffect(() => {
    if (authenticated && tab === "reviews") fetchReviews();
    if (authenticated && tab === "reports") fetchReports();
    if (authenticated && tab === "analytics") fetchAnalytics();
    if (authenticated && tab === "stream_reports") fetchStreamReports();
  }, [authenticated, tab, fetchReviews, fetchReports, fetchAnalytics, fetchStreamReports]);

  const deleteReview = async (review: Review) => {
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setReviews(prev => prev.filter(r => r.id !== review.id));
      toast.success("Review deleted");
    } catch { toast.error("Could not delete review"); }
  };

  const publishAlert = async () => {
    if (!alertMsg.trim()) return;
    setAlertLoading(true);
    try {
      const res = await fetch("/api/admin/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: alertMsg.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setActiveAlert(data);
      setAlertMsg("");
      toast.success("🔔 Alert published — visible to all users!");
    } catch { toast.error("Failed to publish alert"); }
    finally { setAlertLoading(false); }
  };

  const clearAlert = async () => {
    try {
      await fetch("/api/admin/alert", { method: "DELETE" });
      setActiveAlert(null);
      toast.success("Alert cleared");
    } catch { toast.error("Failed to clear alert"); }
  };

  const updateReportStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success(`Report marked as ${status}`);
    } catch { toast.error("Failed to update report"); }
  };

  const deleteReport = async (id: number) => {
    try {
      await fetch(`/api/reports/${id}`, { method: "DELETE" });
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success("Report deleted");
    } catch { toast.error("Failed to delete report"); }
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

  const pendingReports = reports.filter(r => r.status === "pending").length;
  const pendingStreamReports = streamReports.filter(r => r.status === "pending").length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { key: "alert", label: "Global Alert", icon: <Bell className="w-4 h-4" /> },
    { key: "reviews", label: "Reviews", icon: <Trash2 className="w-4 h-4" /> },
    { key: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
    { key: "trending", label: "Trending", icon: <TrendingUp className="w-4 h-4" /> },
    { key: "reports", label: "Reports", icon: <Flag className="w-4 h-4" />, badge: pendingReports },
    { key: "stream_reports", label: "Streams", icon: <Radio className="w-4 h-4" />, badge: pendingStreamReports },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", boxShadow: "0 0 15px rgba(255,215,0,0.2)" }}>
            <Crown className="w-5 h-5" style={{ color: "#FFD700" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black font-heading text-white">Admin Panel</h1>
              <VerifiedAdminBadge />
            </div>
            <p className="text-muted-foreground text-sm">ZAIX Content Management — Full Control</p>
          </div>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 shrink-0"
            onClick={() => { logout(); toast.success("Logged out"); }}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
          </Button>
        </div>

        {/* Maintenance Banner */}
        {maintenanceMode && (
          <div className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3 border"
            style={{ background: "rgba(255,100,0,0.1)", borderColor: "rgba(255,100,0,0.4)" }}>
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
            <p className="text-orange-300 text-sm font-semibold flex-1">
              Maintenance Mode is <strong>ON</strong> — Normal users see "Coming Back Soon".
            </p>
          </div>
        )}

        {/* Maintenance toggle */}
        <div className="mb-5 bg-card border rounded-xl p-4 flex items-center gap-4"
          style={{ borderColor: maintenanceMode ? "rgba(255,100,0,0.4)" : "rgba(255,255,255,0.1)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: maintenanceMode ? "rgba(255,100,0,0.15)" : "rgba(100,100,100,0.15)", border: `1px solid ${maintenanceMode ? "rgba(255,100,0,0.4)" : "rgba(100,100,100,0.3)"}` }}>
            <Power className="w-4 h-4" style={{ color: maintenanceMode ? "#FF6400" : "#666" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm">Maintenance Mode</p>
            <p className="text-xs text-muted-foreground">When ON, visitors see "Coming Back Soon". You bypass it as admin.</p>
          </div>
          <button onClick={() => { const next = !maintenanceMode; setMaintenanceMode(next); toast[next ? "warning" : "success"](next ? "🔴 Site locked for normal users" : "🟢 Site is live again"); }}
            className="shrink-0 relative inline-flex h-7 w-14 items-center rounded-full transition-colors"
            style={{ background: maintenanceMode ? "#FF6400" : "#333" }}
            role="switch" aria-checked={maintenanceMode}>
            <span className="inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform"
              style={{ transform: maintenanceMode ? "translateX(32px)" : "translateX(4px)" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card border border-border rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative min-w-[72px] ${tab === t.key ? "text-black font-bold" : "text-muted-foreground hover:text-white"}`}
              style={tab === t.key ? { background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 15px rgba(255,215,0,0.3)" } : {}}>
              {t.icon} {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* === ANALYTICS TAB === */}
        {tab === "analytics" && (
          <div className="flex flex-col gap-5">
            <h2 className="font-bold text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Real-Time Analytics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {analyticsLoading ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
              ) : ([
                { label: "Registered Users", value: analytics?.totalUsers ?? 0, icon: "👥", color: "#a855f7" },
                { label: "Total Reviews", value: analytics?.totalReviews ?? 0, icon: "📝", color: "#FFD700" },
                { label: "Banned Users", value: bannedUsers.length, icon: "🚫", color: "#FF4444" },
                { label: "Tagged Anime", value: Object.keys(trendingTags).length, icon: "📈", color: "#FF8C00" },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center flex flex-col gap-1">
                  <div className="text-2xl">{s.icon}</div>
                  <p className="text-2xl font-black text-white" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
                </div>
              )))}
            </div>
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 w-fit" onClick={fetchAnalytics} disabled={analyticsLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${analyticsLoading ? "animate-spin" : ""}`} /> Refresh Analytics
            </Button>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <Flag className="w-4 h-4 text-red-400" /> Quick Stats
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Active Global Alert", value: activeAlert ? "Yes — \"" + activeAlert.message.slice(0, 30) + "...\"" : "None", warn: !!activeAlert },
                  { label: "Maintenance Mode", value: maintenanceMode ? "ENABLED" : "OFF", warn: maintenanceMode },
                  { label: "Pending Reports", value: reports.filter(r => r.status === "pending").length + " reports", warn: reports.filter(r => r.status === "pending").length > 0 },
                  { label: "Trending Tags Active", value: Object.keys(trendingTags).length + " anime", warn: false },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                    <span className="text-muted-foreground text-xs">{s.label}</span>
                    <span className={`text-xs font-semibold ${s.warn ? "text-orange-400" : "text-white"}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === GLOBAL ALERT TAB === */}
        {tab === "alert" && (
          <div className="flex flex-col gap-5">
            <h2 className="font-bold text-white flex items-center gap-2"><Megaphone className="w-4 h-4 text-primary" /> Global Alert System</h2>
            <p className="text-sm text-muted-foreground">Publish a scrolling neon announcement visible to <strong className="text-white">all users</strong> at the top of the site.</p>
            {activeAlert && (
              <div className="rounded-xl p-4 border flex items-start gap-3" style={{ background: "rgba(168,85,247,0.05)", borderColor: "rgba(168,85,247,0.3)" }}>
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse" style={{ background: "#a855f7" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1">LIVE ALERT</p>
                  <p className="text-white text-sm font-medium break-words">{activeAlert.message}</p>
                </div>
                <button onClick={clearAlert} className="shrink-0 text-muted-foreground hover:text-red-400 transition-colors" title="Clear alert">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <label className="text-sm font-semibold text-white">Alert Message</label>
              <textarea
                value={alertMsg}
                onChange={(e) => setAlertMsg(e.target.value)}
                placeholder="e.g. New seasons added! Check out the latest episodes of..."
                maxLength={500}
                rows={3}
                className="bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{alertMsg.length}/500 characters</span>
                <div className="flex gap-2">
                  {activeAlert && (
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={clearAlert}>
                      <X className="w-4 h-4 mr-1.5" /> Clear Alert
                    </Button>
                  )}
                  <Button
                    className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold"
                    onClick={publishAlert}
                    disabled={!alertMsg.trim() || alertLoading}
                  >
                    {alertLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
                    {activeAlert ? "Update Alert" : "Publish Alert"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
              <div className="rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 text-black text-sm font-bold"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #a855f7, #c084fc, #a855f7, #7c3aed)" }}>
                  <Megaphone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{alertMsg || "Your alert message will scroll here for everyone to see..."}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === REVIEWS TAB === */}
        {tab === "reviews" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-400" /> Manage Reviews</h2>
              <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={fetchReviews}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
            {reviewsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No reviews found across common content IDs.</p>
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
                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground px-1.5">{r.contentType} #{r.contentId}</Badge>
                        <span className="text-xs text-primary">★ {r.rating}/5</span>
                        {isBanned(r.userName) && <Badge variant="outline" className="text-[9px] border-red-500/50 text-red-400 bg-red-500/10">BANNED</Badge>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { if (isBanned(r.userName)) { unbanUser(r.userName); toast.success(`Unbanned ${r.userName}`); } else { banUser(r.userName); toast.success(`Banned ${r.userName}`); } }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${isBanned(r.userName) ? "border-green-500/30 text-green-400 hover:bg-green-500/10" : "border-orange-500/30 text-orange-400 hover:bg-orange-500/10"}`}>
                          <Ban className="w-3 h-3 inline mr-1" />{isBanned(r.userName) ? "Unban" : "Ban"}
                        </button>
                        <button onClick={() => deleteReview(r)} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                        </button>
                      </div>
                    </div>
                    {r.reviewText && <p className="text-sm text-muted-foreground leading-relaxed">{r.reviewText}</p>}
                    <p className="text-[10px] text-muted-foreground/60">{timeAgo(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === USERS TAB === */}
        {tab === "users" && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-white flex items-center gap-2"><Ban className="w-4 h-4 text-orange-400" /> Ban / Unban Users</h2>
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">Enter a username to ban from submitting reviews and appearing in content.</p>
              <div className="flex gap-2">
                <input type="text" value={banInput} onChange={(e) => setBanInput(e.target.value)} placeholder="Username to ban..."
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                  onKeyDown={(e) => { if (e.key === "Enter" && banInput.trim()) { banUser(banInput.trim()); toast.success(`Banned "${banInput.trim()}"`); setBanInput(""); } }} />
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold shrink-0" disabled={!banInput.trim()}
                  onClick={() => { banUser(banInput.trim()); toast.success(`Banned "${banInput.trim()}"`); setBanInput(""); }}>
                  <Ban className="w-4 h-4 mr-1.5" /> Ban
                </Button>
              </div>
            </div>
            {bannedUsers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary/30" /><p>No banned users. Community is clean!</p></div>
            ) : (
              <div className="flex flex-col gap-2">
                {bannedUsers.map((u) => (
                  <div key={u} className="bg-card border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><Ban className="w-4 h-4 text-red-400" /></div>
                      <span className="font-bold text-white text-sm">{u}</span>
                      <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-400 bg-red-500/10">BANNED</Badge>
                    </div>
                    <button onClick={() => { unbanUser(u); toast.success(`Unbanned ${u}`); }}
                      className="text-xs font-semibold text-green-400 hover:text-green-300 border border-green-500/30 hover:bg-green-500/10 px-3 py-1 rounded-lg transition-all">
                      <X className="w-3 h-3 inline mr-1" /> Unban
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === TRENDING TAB === */}
        {tab === "trending" && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Manage Trending / Hot Tags</h2>
            <p className="text-sm text-muted-foreground">Search for an anime and apply a Trending or Hot tag. These appear as badges on anime cards across the site.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={animeSearch} onChange={(e) => setAnimeSearch(e.target.value)} placeholder="Search anime to tag..."
                className="w-full bg-secondary border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors" />
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
                          {tag ? (<>
                            {tag.tag === "hot" ? <span className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 rounded">🔥 HOT</span>
                              : <span className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded">📈 TRENDING</span>}
                            <button onClick={() => { removeTrendingTag(String(anime.malId)); toast.success("Tag removed"); }} className="text-[10px] text-muted-foreground hover:text-red-400">
                              <X className="w-3 h-3 inline" /> Remove
                            </button>
                          </>) : <span className="text-[10px] text-muted-foreground">No tag</span>}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => { addTrendingTag(String(anime.malId), "trending"); toast.success(`📈 Tagged as Trending`); }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-primary/40 text-primary hover:bg-primary/10 transition-all flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Trending
                        </button>
                        <button onClick={() => { addTrendingTag(String(anime.malId), "hot"); toast.success(`🔥 Tagged as Hot`); }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Hot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {Object.keys(trendingTags).length > 0 && (
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Currently Tagged</h3>
                <div className="flex flex-col gap-2">
                  {Object.entries(trendingTags).map(([id, t]) => (
                    <div key={id} className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {t.tag === "hot" ? <span className="text-[10px] font-bold text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded">🔥 HOT</span>
                          : <span className="text-[10px] font-bold text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded">📈 TRENDING</span>}
                        <span className="text-sm text-muted-foreground font-mono">ID: {id}</span>
                      </div>
                      <button onClick={() => { removeTrendingTag(id); toast.success("Tag removed"); }} className="text-xs text-muted-foreground hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === STREAM REPORTS TAB === */}
        {tab === "stream_reports" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-400" /> Broken Stream Reports
                {pendingStreamReports > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{pendingStreamReports} pending</span>
                )}
              </h2>
              <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={fetchStreamReports}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
            {streamReportsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : streamReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                <p>No stream reports yet. All servers are clean!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {streamReports.map((r) => (
                  <div key={r.id} className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${r.status === "pending" ? "border-red-500/30" : "border-border opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white line-clamp-1 max-w-[200px]">{r.animeTitle}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 border-primary/40 text-primary bg-primary/5">
                            Ep {r.episode}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] px-1.5 ${r.status === "pending" ? "border-red-500/50 text-red-400 bg-red-500/10" : r.status === "resolved" ? "border-green-500/50 text-green-400" : "border-border text-muted-foreground"}`}>
                            {r.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Provider:</span>
                          <span className="text-xs font-bold text-orange-400 border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 rounded">{r.providerLabel}</span>
                          <span className="text-xs text-muted-foreground font-mono text-muted-foreground/50">({r.provider})</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Reported by: <strong className="text-white">{r.reportedBy}</strong> · MAL ID: <span className="font-mono text-muted-foreground/70">{r.malId}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => updateStreamReportStatus(r.id, "resolved")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all">
                            <CheckCircle className="w-3 h-3 inline mr-1" /> Mark Fixed
                          </button>
                          <button onClick={() => updateStreamReportStatus(r.id, "dismissed")}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
                            Dismiss
                          </button>
                        </>
                      )}
                      <button onClick={() => deleteStreamReport(r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all">
                        <X className="w-3 h-3 inline mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === REPORTS TAB === */}
        {tab === "reports" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" /> Reported Reviews
                {reports.filter(r => r.status === "pending").length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{reports.filter(r => r.status === "pending").length} pending</span>
                )}
              </h2>
              <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={fetchReports}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
              </Button>
            </div>
            {reportsLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                <p>No reports yet. Community is clean!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <div key={r.id} className={`bg-card border rounded-xl p-4 flex flex-col gap-3 ${r.status === "pending" ? "border-red-500/30" : "border-border opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">Report #{r.id}</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 ${r.status === "pending" ? "border-red-500/50 text-red-400 bg-red-500/10" : r.status === "resolved" ? "border-green-500/50 text-green-400" : "border-border text-muted-foreground"}`}>
                            {r.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          User <strong className="text-white">{r.reportedUser}</strong> — Reason: <strong className="text-orange-400">{r.reason}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">Reported by: <strong className="text-white">{r.reportedBy}</strong></p>
                      </div>
                    </div>
                    {r.reviewText && (
                      <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border">
                        <p className="text-xs text-muted-foreground italic">"{r.reviewText.slice(0, 200)}{r.reviewText.length > 200 ? "…" : ""}"</p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {r.status === "pending" && (<>
                        <button onClick={() => updateReportStatus(r.id, "resolved")}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all">
                          <CheckCircle className="w-3 h-3 inline mr-1" /> Mark Resolved
                        </button>
                        <button onClick={() => updateReportStatus(r.id, "dismissed")}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-white hover:border-white/30 transition-all">
                          Dismiss
                        </button>
                        <button onClick={() => { const rev = reviews.find(rev => rev.id === r.reviewId); if (rev) deleteReview(rev); updateReportStatus(r.id, "resolved"); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete Review
                        </button>
                      </>)}
                      <button onClick={() => deleteReport(r.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-all">
                        <X className="w-3 h-3 inline mr-1" /> Remove Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
