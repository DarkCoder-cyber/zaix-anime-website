import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  User, BookOpen, Clock, Edit3, Camera, Save, Tv, Library, Trash2, X, Shield,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProfile, useLibrary, useRecentlyVisited } from "@/hooks/use-local-store";
import { isAdminUsername } from "@/hooks/use-admin";
import { AdminCrown, VerifiedAdminBadge } from "@/components/admin-badge";

const PRESET_AVATARS = ["🎌", "⚔️", "🌸", "🔥", "🌙", "⚡", "🐉", "🌟", "🎭", "🦊"];

type Tab = "profile" | "library" | "history";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

function AvatarDisplay({ avatar, size = "md" }: { avatar: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = { sm: "w-8 h-8 text-base", md: "w-10 h-10 text-xl", lg: "w-14 h-14 text-3xl", xl: "w-20 h-20 text-5xl" };
  const isDataUrl = avatar.startsWith("data:");
  return (
    <div className={`${sizeMap[size]} rounded-full border-2 border-primary/50 bg-black/60 flex items-center justify-center overflow-hidden shadow-neon shrink-0`}>
      {isDataUrl ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <span>{avatar}</span>}
    </div>
  );
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { profile, updateProfile } = useProfile();
  const { items: libraryItems, removeFromLibrary } = useLibrary();
  const { recent } = useRecentlyVisited();
  const [, setLocation] = useLocation();
  const isAdmin = isAdminUsername(profile.username);

  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [draftUsername, setDraftUsername] = useState(profile.username);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar);
  const fileRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraftUsername(profile.username);
    setDraftBio(profile.bio);
    setDraftAvatar(profile.avatar);
    setEditing(true);
  };

  const saveEdit = () => {
    updateProfile({ username: draftUsername.trim() || "Weeb", bio: draftBio.trim(), avatar: draftAvatar });
    setEditing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setDraftAvatar(reader.result); };
    reader.readAsDataURL(file);
  };

  const navigate = (path: string) => { setLocation(path); onClose(); };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
    { key: "library", label: `Library (${libraryItems.length})`, icon: <Library className="w-4 h-4" /> },
    { key: "history", label: "History", icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-black/95 border border-primary/30 shadow-neon-intense text-white max-w-lg w-full p-0 gap-0 rounded-xl overflow-hidden">
        <DialogHeader className="sr-only"><DialogTitle>User Profile</DialogTitle></DialogHeader>

        {/* Profile header banner */}
        <div
          className="relative h-24 border-b border-primary/20"
          style={{
            background: isAdmin
              ? "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(0,0,0,1), rgba(255,165,0,0.1))"
              : "linear-gradient(135deg, rgba(57,255,20,0.2), black, rgba(57,255,20,0.1))",
          }}
        >
          <div className="absolute inset-0" style={{
            background: isAdmin
              ? "radial-gradient(ellipse at top right, rgba(255,215,0,0.15), transparent)"
              : "radial-gradient(ellipse at top right, rgba(57,255,20,0.15), transparent)"
          }} />
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Avatar — overlapping the banner */}
          <div className="absolute -bottom-8 left-5">
            <div className="relative">
              <div
                className={`${isAdmin ? "p-[2px] rounded-full" : ""}`}
                style={isAdmin ? { background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 20px rgba(255,215,0,0.4)" } : {}}
              >
                <AvatarDisplay avatar={editing ? draftAvatar : profile.avatar} size="xl" />
              </div>
              {isAdmin && (
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", boxShadow: "0 0 10px rgba(255,215,0,0.6)" }}
                >
                  <AdminCrown size="sm" className="text-black" style={{ color: "black" }} />
                </div>
              )}
              {editing && (
                <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-black flex items-center justify-center shadow-neon hover:bg-primary/80 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </div>

        {/* Name / edit area */}
        <div className="px-5 pt-12 pb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex flex-col gap-2">
                <input value={draftUsername} onChange={(e) => setDraftUsername(e.target.value)} maxLength={30} placeholder="Username" className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-primary/60 w-full" />
                <textarea value={draftBio} onChange={(e) => setDraftBio(e.target.value)} maxLength={200} placeholder="Write a short bio..." rows={2} className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none w-full" />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1.5">Choose avatar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_AVATARS.map((emoji) => (
                      <button key={emoji} onClick={() => setDraftAvatar(emoji)} className={`w-8 h-8 rounded-full text-lg flex items-center justify-center border-2 transition-all ${draftAvatar === emoji ? "border-primary shadow-neon scale-110" : "border-border hover:border-primary/50"}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold font-heading text-xl" style={isAdmin ? { color: "#FFD700" } : { color: "white" }}>
                    {profile.username}
                  </h2>
                  {isAdmin && <AdminCrown size="md" />}
                </div>
                {isAdmin && (
                  <div className="mt-1.5 mb-1">
                    <VerifiedAdminBadge />
                  </div>
                )}
                {profile.bio ? (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/50 mt-1 italic">No bio yet</p>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 shrink-0 flex-col items-end">
            {editing ? (
              <>
                <Button size="sm" className="bg-primary text-black hover:bg-primary/90 shadow-neon gap-1.5" onClick={saveEdit}><Save className="w-3.5 h-3.5" /> Save</Button>
                <Button size="sm" variant="outline" className="border-border text-muted-foreground" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 gap-1.5" onClick={startEdit}><Edit3 className="w-3.5 h-3.5" /> Edit</Button>
                {isAdmin && (
                  <button onClick={() => navigate("/xadmin")} className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-90" style={{ borderColor: "rgba(255,215,0,0.4)", color: "#FFD700", background: "rgba(255,215,0,0.1)" }}>
                    <Shield className="w-3 h-3" /> Admin Panel
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="px-5 pb-4 flex gap-4">
          <div className="text-center"><p className="text-primary font-bold text-lg">{libraryItems.length}</p><p className="text-muted-foreground text-xs">Saved</p></div>
          <div className="text-center"><p className="text-primary font-bold text-lg">{recent.length}</p><p className="text-muted-foreground text-xs">Visited</p></div>
          <div className="text-center"><p className="text-primary font-bold text-lg">{libraryItems.filter(i => i.type === "anime").length}</p><p className="text-muted-foreground text-xs">Anime</p></div>
          <div className="text-center"><p className="text-primary font-bold text-lg">{libraryItems.filter(i => i.type === "manga").length}</p><p className="text-muted-foreground text-xs">Manga</p></div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-primary/15 border-b border-b-primary/10">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${tab === t.key ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-white"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-4">
          {/* Library tab */}
          {tab === "library" && (
            <>
              {libraryItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Library className="w-10 h-10 mx-auto mb-3 text-primary/20" /><p className="text-sm">Your library is empty</p><p className="text-xs mt-1">Click the + on any card to save it</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {libraryItems.map((item) => (
                    <div key={item.id} className="group relative rounded-lg overflow-hidden bg-secondary/30 border border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate(item.type === "anime" ? `/watch/${item.id}` : `/manga/${item.id}`)}>
                      <div className="aspect-[3/4] relative">
                        {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-secondary flex items-center justify-center">{item.type === "anime" ? <Tv className="w-8 h-8 text-primary/30" /> : <BookOpen className="w-8 h-8 text-primary/30" />}</div>}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <Badge className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0 ${item.type === "anime" ? "bg-blue-500/80 text-white" : "bg-primary/80 text-black"}`}>{item.type}</Badge>
                        <button onClick={(e) => { e.stopPropagation(); removeFromLibrary(item.id); }} className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"><Trash2 className="w-3 h-3" /></button>
                        <p className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] font-semibold text-white line-clamp-2 leading-tight">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* History tab */}
          {tab === "history" && (
            <>
              {recent.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Clock className="w-10 h-10 mx-auto mb-3 text-primary/20" /><p className="text-sm">No history yet</p><p className="text-xs mt-1">Browse anime & manga to see them here</p></div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recent.map((item) => (
                    <button key={item.id + item.visitedAt} onClick={() => navigate(item.type === "anime" ? `/watch/${item.id}` : `/manga/${item.id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left group">
                      <div className="w-9 h-12 rounded overflow-hidden bg-secondary shrink-0">
                        {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">{item.type === "anime" ? <Tv className="w-4 h-4 text-primary/30" /> : <BookOpen className="w-4 h-4 text-primary/30" />}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-primary transition-colors line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{item.type} · {new Date(item.visitedAt).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Profile info tab */}
          {tab === "profile" && (
            <div className="flex flex-col gap-4 text-sm">
              {isAdmin && (
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.3)" }}>
                  <AdminCrown size="md" />
                  <div>
                    <p className="font-bold text-sm" style={{ color: "#FFD700" }}>Administrator</p>
                    <p className="text-xs text-muted-foreground">Full access to content management tools</p>
                  </div>
                </div>
              )}
              <div className="bg-secondary/30 border border-border rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-semibold" style={isAdmin ? { color: "#FFD700" } : { color: "white" }}>{profile.username}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Bio</span>
                  <span className="text-white text-right text-xs leading-relaxed">{profile.bio || <span className="text-muted-foreground italic">Not set</span>}</span>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border rounded-xl p-4 flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Activity</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Library items</span><span className="text-primary font-bold">{libraryItems.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Anime saved</span><span className="text-primary font-bold">{libraryItems.filter(i => i.type === "anime").length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manga / Manhwa saved</span><span className="text-primary font-bold">{libraryItems.filter(i => i.type === "manga").length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pages visited</span><span className="text-primary font-bold">{recent.length}</span></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
