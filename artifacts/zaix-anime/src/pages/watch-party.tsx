import { useState } from "react";
import { Film, Users, Copy, Check, Link2, Crown, Mic, MicOff, Volume2, VolumeX, Play, Pause, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Participant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMuted: boolean;
}

const MOCK_PARTICIPANTS: Participant[] = [
  { id: "1", name: "You (Host)", avatar: "🦊", isHost: true, isMuted: false },
  { id: "2", name: "KiraKun", avatar: "🐉", isHost: false, isMuted: false },
  { id: "3", name: "SakuraChan", avatar: "🌸", isHost: false, isMuted: true },
];

export default function WatchPartyPage() {
  const [partyCode] = useState(() => Math.random().toString(36).slice(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, user: "KiraKun", avatar: "🐉", text: "Yo let's gooo 🔥", color: "text-blue-400" },
    { id: 2, user: "SakuraChan", avatar: "🌸", text: "Finally watch party!!", color: "text-pink-400" },
  ]);

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/watch-party?code=${partyCode}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    toast.success("Party link copied!", { description: "Share it with friends", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    setMessages((m) => [...m, { id: Date.now(), user: "You", avatar: "🦊", text: chatMsg.trim(), color: "text-primary" }]);
    setChatMsg("");
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24">
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-neon">
            <Film className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-heading text-white text-shadow-neon">Watch Party</h1>
            <p className="text-muted-foreground text-sm">Sync anime with your friends in real-time</p>
          </div>
          <Badge className="ml-auto bg-primary/10 border border-primary/30 text-primary text-xs font-bold animate-pulse-glow">
            BETA
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Video player placeholder + controls */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Player */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative border border-primary/20 shadow-neon">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-neon animate-pulse-glow">
                  <Film className="w-10 h-10 text-primary/70" />
                </div>
                <h2 className="text-xl font-bold font-heading text-white">No Anime Selected</h2>
                <p className="text-muted-foreground text-sm text-center max-w-xs">
                  Go to any anime's watch page and click <span className="text-primary font-semibold">Watch Party</span> to sync with friends.
                </p>
                <Button className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold mt-2" onClick={() => window.history.back()}>
                  <Zap className="w-4 h-4 mr-2" /> Pick an Anime
                </Button>
              </div>

              {/* Sync bar (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-primary/20 px-4 py-3 flex items-center gap-4">
                <button onClick={() => setIsPlaying(v => !v)} className="w-9 h-9 rounded-full bg-primary text-black flex items-center justify-center shadow-neon hover:bg-primary/90 transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <div className="flex-1 h-1 bg-white/10 rounded-full">
                  <div className="h-full w-0 bg-primary rounded-full shadow-neon transition-all" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">00:00 / --:--</span>
                <button onClick={() => setIsMuted(v => !v)} className="text-muted-foreground hover:text-primary transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sync status */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-neon" />
                <span className="text-sm text-white font-medium">Party Code:</span>
                <code className="text-primary font-mono font-bold text-sm tracking-widest">{partyCode}</code>
              </div>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 ml-auto" onClick={copyLink}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10" onClick={copyLink}>
                <Link2 className="w-3.5 h-3.5 mr-1.5" /> Share
              </Button>
            </div>

            {/* Join by code */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Join Someone's Party
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter party code (e.g. AB12CD)"
                  maxLength={6}
                  className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-primary/50 uppercase"
                />
                <Button
                  className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold"
                  disabled={joinCode.length < 6}
                  onClick={() => { setJoined(true); toast.success("Joined party!", { description: `Connected to room ${joinCode}` }); }}
                >
                  Join
                </Button>
              </div>
              {joined && (
                <div className="flex items-center gap-2 text-primary text-sm animate-in fade-in">
                  <Check className="w-4 h-4" /> Connected to room <strong>{joinCode}</strong>
                </div>
              )}
            </div>

            {/* Feature list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: <Clock className="w-5 h-5 text-primary" />, title: "Synchronized Playback", desc: "All viewers stay in perfect sync" },
                { icon: <Users className="w-5 h-5 text-primary" />, title: "Up to 20 Friends", desc: "Host a party for your whole squad" },
                { icon: <Mic className="w-5 h-5 text-primary" />, title: "Voice Chat (Soon)", desc: "React together, live" },
              ].map((f) => (
                <div key={f.title} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">{f.icon}</div>
                  <p className="font-bold text-white text-sm">{f.title}</p>
                  <p className="text-muted-foreground text-xs">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: participants + chat */}
          <div className="flex flex-col gap-4">

            {/* Participants */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Participants ({MOCK_PARTICIPANTS.length})
              </h3>
              <div className="flex flex-col gap-2">
                {MOCK_PARTICIPANTS.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/40">
                    <span className="text-xl">{p.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white line-clamp-1">{p.name}</p>
                    </div>
                    {p.isHost && (
                      <Badge className="bg-primary/20 text-primary border border-primary/30 text-[9px] px-1.5">
                        <Crown className="w-2.5 h-2.5 mr-0.5" /> HOST
                      </Badge>
                    )}
                    {p.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-primary/60" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Party chat */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col flex-1">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" /> Party Chat
              </h3>
              <div className="flex-1 h-64 overflow-y-auto custom-scrollbar flex flex-col gap-2 text-sm mb-3">
                {messages.map((m) => (
                  <div key={m.id} className="flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">{m.avatar}</span>
                    <div>
                      <span className={`font-bold text-xs ${m.color}`}>{m.user}: </span>
                      <span className="text-white/90">{m.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                  placeholder="Hype it up..."
                  className="flex-1 bg-secondary border border-border rounded-full px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <button onClick={sendMsg} className="w-9 h-9 rounded-full bg-primary text-black flex items-center justify-center shadow-neon hover:bg-primary/90">
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
