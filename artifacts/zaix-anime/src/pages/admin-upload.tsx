import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { toast } from "sonner";
import {
  Plus, Trash2, Film, Link, RefreshCw, Upload,
  ChevronDown, LogOut, CheckCircle, AlertCircle, Loader2
} from "lucide-react";

interface CustomStream {
  id: number;
  malId: number;
  animeTitle: string;
  episode: number;
  streamUrl: string;
  language: string;
  quality: string;
  providerLabel: string;
  addedBy: string;
  createdAt: string;
}

const PRESETS = [
  { malId: 8687, title: "Doraemon (2005)", label: "Doraemon", emoji: "🤖" },
  { malId: 1068, title: "Crayon Shin-chan", label: "Shinchan", emoji: "😆" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminUploadPage() {
  const { authenticated, adminToken, login, logout } = useAdmin();
  const [, setLocation] = useLocation();

  const [streams, setStreams] = useState<CustomStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterMalId, setFilterMalId] = useState<number | null>(null);

  const [form, setForm] = useState({
    malId: "",
    animeTitle: "",
    episode: "",
    streamUrl: "",
    quality: "HD",
    providerLabel: "Custom",
    language: "hindi",
  });

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const authHeader = { Authorization: `Bearer ${adminToken}` };

  const fetchStreams = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/streams", { headers: authHeader });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStreams(data.streams ?? []);
    } catch {
      toast.error("Failed to load streams");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, adminToken]);

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setForm((f) => ({ ...f, malId: String(preset.malId), animeTitle: preset.title }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.malId || !form.animeTitle || !form.episode || !form.streamUrl) {
      toast.error("Please fill all required fields"); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          malId: Number(form.malId),
          animeTitle: form.animeTitle,
          episode: Number(form.episode),
          streamUrl: form.streamUrl,
          quality: form.quality,
          providerLabel: form.providerLabel,
          language: form.language,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add stream");
      }
      toast.success(`Stream added for ${form.animeTitle} Ep${form.episode}`);
      setForm((f) => ({ ...f, episode: "", streamUrl: "" }));
      fetchStreams();
    } catch (err: any) {
      toast.error(err.message || "Failed to add stream");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string, ep: number) => {
    if (!confirm(`Delete stream for ${title} Ep${ep}?`)) return;
    try {
      const res = await fetch(`/api/admin/streams/${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error();
      toast.success("Stream deleted");
      setStreams((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to delete stream");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const ok = await login(loginForm.username, loginForm.password);
      if (!ok) {
        setLoginError("Wrong credentials. Access denied.");
        setLoginForm((f) => ({ ...f, password: "" }));
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const filteredStreams = filterMalId
    ? streams.filter((s) => s.malId === filterMalId)
    : streams;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 30px rgba(168,85,247,0.15)" }}>
              <Upload className="w-8 h-8" style={{ color: "#a855f7" }} />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Upload</h1>
            <p className="text-muted-foreground text-sm mt-1">Hindi stream link management</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Admin username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            />
            {loginError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <button type="submit" disabled={loginLoading}
              className="w-full py-3 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-6 pb-24 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}>
              <Upload className="w-5 h-5" style={{ color: "#a855f7" }} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">Hindi Stream Upload</h1>
              <p className="text-xs text-muted-foreground">Doraemon & Shinchan stream management</p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-400/10">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>

        {/* Admin identity banner */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-6 text-xs font-semibold"
          style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.25)", color: "#ffd700" }}>
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          Authenticated as <span className="font-black">AdminZaik</span>
          <span className="opacity-50 font-normal ml-1">— Only this account can access this page</span>
        </div>

        {/* Add Stream Form */}
        <div className="rounded-2xl border p-5 mb-6"
          style={{ background: "rgba(168,85,247,0.04)", borderColor: "rgba(168,85,247,0.2)" }}>
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" style={{ color: "#a855f7" }} />
            Add Hindi Stream Link
          </h2>

          {/* Presets */}
          <div className="flex gap-2 mb-4">
            {PRESETS.map((preset) => (
              <button key={preset.malId} onClick={() => applyPreset(preset)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                style={form.malId === String(preset.malId)
                  ? { background: "rgba(168,85,247,0.2)", border: "1.5px solid rgba(168,85,247,0.6)", color: "#a855f7" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }
                }>
                <span className="text-base">{preset.emoji}</span>
                {preset.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">MAL ID *</label>
                <input
                  type="number"
                  placeholder="e.g. 8687"
                  value={form.malId}
                  onChange={(e) => setForm((f) => ({ ...f, malId: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Episode *</label>
                <input
                  type="number"
                  placeholder="e.g. 1"
                  min={1}
                  value={form.episode}
                  onChange={(e) => setForm((f) => ({ ...f, episode: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Anime Title *</label>
              <input
                type="text"
                placeholder="e.g. Doraemon (2005)"
                value={form.animeTitle}
                onChange={(e) => setForm((f) => ({ ...f, animeTitle: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Link className="w-3 h-3" /> Stream URL *
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={form.streamUrl}
                onChange={(e) => setForm((f) => ({ ...f, streamUrl: e.target.value }))}
                className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none"
                style={{ border: "1px solid rgba(168,85,247,0.25)" }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Language</label>
                <select value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <option value="hindi">Hindi</option>
                  <option value="english">English</option>
                  <option value="japanese">Japanese</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Quality</label>
                <select value={form.quality} onChange={(e) => setForm((f) => ({ ...f, quality: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <option value="HD">HD</option>
                  <option value="SD">SD</option>
                  <option value="FHD">FHD</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Provider Label</label>
                <input
                  type="text"
                  placeholder="e.g. GDrive"
                  value={form.providerLabel}
                  onChange={(e) => setForm((f) => ({ ...f, providerLabel: e.target.value }))}
                  className="w-full bg-secondary rounded-xl px-3 py-2.5 text-white text-sm placeholder:text-muted-foreground focus:outline-none"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-1"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)", boxShadow: "0 0 20px rgba(168,85,247,0.3)" }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? "Adding..." : "Add Stream Link"}
            </button>
          </form>
        </div>

        {/* Existing Streams */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Film className="w-4 h-4" style={{ color: "#a855f7" }} />
              Saved Streams ({streams.length})
            </h2>
            <div className="flex items-center gap-2">
              {/* Filter buttons */}
              <button onClick={() => setFilterMalId(null)}
                className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                style={filterMalId === null
                  ? { background: "rgba(168,85,247,0.2)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }
                  : { color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
                }>All</button>
              {PRESETS.map((p) => (
                <button key={p.malId} onClick={() => setFilterMalId(filterMalId === p.malId ? null : p.malId)}
                  className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors"
                  style={filterMalId === p.malId
                    ? { background: "rgba(168,85,247,0.2)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.4)" }
                    : { color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
                  }>
                  {p.emoji} {p.label}
                </button>
              ))}
              <button onClick={fetchStreams} disabled={loading}
                className="text-xs text-muted-foreground hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a855f7" }} />
            </div>
          ) : filteredStreams.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <Film className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No streams added yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Use the form above to add your first link.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredStreams.map((stream) => (
                <div key={stream.id}
                  className="flex items-start gap-3 p-4 rounded-xl border group transition-all hover:border-purple-500/30"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                      {PRESETS.find((p) => p.malId === stream.malId)?.emoji ?? "📺"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{stream.animeTitle}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}>
                        Ep {stream.episode}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {stream.language.toUpperCase()} · {stream.quality}
                      </span>
                      <span className="text-xs text-muted-foreground/60">{stream.providerLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs font-mono">{stream.streamUrl}</p>
                    <p className="text-xs text-muted-foreground/40 mt-0.5">Added {timeAgo(stream.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(stream.id, stream.animeTitle, stream.episode)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete stream">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
