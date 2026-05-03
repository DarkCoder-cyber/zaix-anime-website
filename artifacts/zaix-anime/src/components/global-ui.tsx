import { useEffect, useState, useRef, useCallback } from "react";
import { MessageCircle, Send, Smile, X, Plus } from "lucide-react";
import { ChatBot } from "@/components/chat-bot";
import { AdminCrown } from "@/components/admin-badge";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

interface Reaction { emoji: string; count: number; users: string[] }
interface LiveMsg {
  id: number;
  userName: string;
  message: string;
  isAdmin: boolean;
  isSystem?: boolean;
  createdAt: string;
  reactions: Reaction[];
}

// ── Quick-react strip ─────────────────────────────────────────────────────────
const QUICK = ["👍","❤️","😂","🔥","😮"];

// ── Emoji Picker ──────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Faces",
    emojis: ["😄","😂","🤣","😍","🥹","😭","🥺","😎","🤯","😤","💀","🫡","🤩","😏","🫠","😇","🤔","😅","🥳","🤤"],
  },
  {
    label: "Hype",
    emojis: ["🔥","💯","⚡","✨","💥","🎉","🏆","👑","🚀","💪","👀","🫶","🙏","👌","❤️","💚","💜","🖤","🤍","🎊"],
  },
  {
    label: "Anime",
    emojis: ["🎌","🍜","⚔️","🌸","🍡","🎋","🎏","💮","🏮","🗾","👺","👹","🥷","🧙","⛩️","🐉","🦊","🍣","🍱","🎐"],
  },
];

function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute bottom-full left-0 mb-2 w-72 rounded-2xl border overflow-hidden z-50"
      style={{ background: "rgba(10,10,10,0.98)", borderColor: "rgba(168,85,247,0.2)", boxShadow: "0 0 30px rgba(0,0,0,0.7), 0 0 15px rgba(168,85,247,0.08)" }}
    >
      <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button key={cat.label} onClick={() => setTab(i)}
            className="flex-1 py-2 text-xs font-semibold transition-colors"
            style={tab === i ? { color: "#a855f7", borderBottom: "2px solid #a855f7" } : { color: "rgba(255,255,255,0.35)" }}>
            {cat.label}
          </button>
        ))}
        <button onClick={onClose} className="px-2 text-muted-foreground hover:text-white transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-2 grid grid-cols-10 gap-0.5">
        {EMOJI_CATEGORIES[tab].emojis.map((emoji) => (
          <button key={emoji} onClick={() => onPick(emoji)}
            className="text-lg w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Single chat message ───────────────────────────────────────────────────────
function ChatMessageRow({
  m, myName, onReact,
}: {
  m: LiveMsg;
  myName: string;
  onReact: (msgId: number, emoji: string) => void;
}) {
  const [showQuick, setShowQuick] = useState(false);

  const bubbleStyle = m.isAdmin
    ? { background: "rgba(168,85,247,0.06)", border: "1.5px solid rgba(168,85,247,0.5)", boxShadow: "0 0 14px rgba(168,85,247,0.2), inset 0 0 8px rgba(168,85,247,0.04)" }
    : m.isSystem
    ? { background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 0 12px rgba(139,92,246,0.12)" }
    : { background: "rgba(255,255,255,0.04)" };

  const handleReact = (emoji: string) => {
    onReact(m.id, emoji);
    setShowQuick(false);
  };

  // System message — no reactions
  if (m.isSystem) {
    return (
      <div className="rounded-xl px-3 py-2 text-center" style={bubbleStyle}>
        <span className="text-xs font-black tracking-widest uppercase mr-2" style={{ color: "#8b5cf6" }}>⚡ SYSTEM</span>
        <span className="text-white/90 text-xs font-medium">{m.message}</span>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="rounded-xl px-3 py-2" style={bubbleStyle}>
        {/* Name + message */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className={`font-bold inline-flex items-center gap-1.5 mr-1 ${m.isAdmin ? "" : "text-primary"}`}
              style={m.isAdmin ? { color: "#a855f7" } : {}}>
              {m.isAdmin && <AdminCrown size="xs" />}
              {m.userName}:
            </span>
            <span className={m.isAdmin ? "text-white font-medium" : "text-white/85"}>{m.message}</span>
          </div>

          {/* + react button — visible on hover (desktop) or always tiny on mobile */}
          {myName && (
            <button
              onClick={() => setShowQuick((v) => !v)}
              className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity mt-0.5"
              title="Add reaction"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick-react strip */}
        {showQuick && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {QUICK.map((e) => (
              <button key={e} onClick={() => handleReact(e)}
                className="text-base w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-white/15 active:scale-90"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Existing reactions */}
        {m.reactions.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {m.reactions.map((r) => {
              const mine = r.users.includes(myName);
              return (
                <button
                  key={r.emoji}
                  onClick={() => myName && onReact(m.id, r.emoji)}
                  title={r.users.slice(0, 5).join(", ")}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold transition-all active:scale-90"
                  style={mine
                    ? { background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.5)", color: "#a855f7" }
                    : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }
                  }
                >
                  <span>{r.emoji}</span>
                  <span>{r.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live Chat Bubble ──────────────────────────────────────────────────────────
function LiveChatBubble() {
  const [open, setOpen] = useState(false);
  const { authenticated: isAdmin } = useAdmin();
  const { user } = useAuth();
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myName = isAdmin ? "zaix" : (user?.username ?? "");

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 6000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, fetchMessages]);

  useEffect(() => {
    if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setShowEmoji(false);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: myName || "Anonymous", message: text, isAdmin }),
      });
      if (res.ok) await fetchMessages();
    } catch {} finally { setSending(false); }
  };

  const handleReact = async (msgId: number, emoji: string) => {
    if (!myName) return;
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find((r) => r.emoji === emoji);
      const isMine = existing?.users.includes(myName);
      if (isMine) {
        // Remove
        const updated = m.reactions.map((r) =>
          r.emoji !== emoji ? r : { ...r, count: r.count - 1, users: r.users.filter((u) => u !== myName) }
        ).filter((r) => r.count > 0);
        return { ...m, reactions: updated };
      } else {
        // Add
        if (existing) {
          return { ...m, reactions: m.reactions.map((r) =>
            r.emoji !== emoji ? r : { ...r, count: r.count + 1, users: [...r.users, myName] }
          )};
        }
        return { ...m, reactions: [...m.reactions, { emoji, count: 1, users: [myName] }] };
      }
    }));

    try {
      await fetch(`/api/chat/${msgId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: myName, emoji }),
      });
    } catch {}
  };

  const insertEmoji = (emoji: string) => {
    setInput((v) => v + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-24 left-4 sm:left-6 z-50">
      {open && (
        <div className="w-[92vw] max-w-sm sm:w-80 bg-black/95 border rounded-2xl shadow-neon-intense overflow-hidden mb-3"
          style={{ borderColor: "rgba(168,85,247,0.25)" }}>

          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.04)" }}>
            <div className="flex items-center gap-2 font-bold text-sm" style={{ color: "#a855f7" }}>
              <MessageCircle className="w-4 h-4" />
              Live Chat
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a855f7", boxShadow: "0 0 5px #a855f7" }} />
            </div>
            <button className="text-muted-foreground hover:text-white text-lg leading-none" onClick={() => setOpen(false)}>×</button>
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-2 text-sm" style={{ scrollbarWidth: "none" }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No messages yet. Say hello! 👋</div>
            ) : messages.map((m) => (
              <ChatMessageRow key={m.id} m={m} myName={myName} onReact={handleReact} />
            ))}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t relative" style={{ borderColor: "rgba(168,85,247,0.12)" }}>
            {showEmoji && (
              <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
            )}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setShowEmoji((v) => !v)}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-white/10"
                style={{ color: showEmoji ? "#a855f7" : "rgba(255,255,255,0.35)" }}
              >
                <Smile className="w-4 h-4" />
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={isAdmin ? "Send as zaix (admin)…" : myName ? "Message the room…" : "Login to chat…"}
                maxLength={300}
                disabled={!myName}
                className="flex-1 bg-secondary rounded-full px-3 py-2 text-sm text-white focus:outline-none transition-all disabled:opacity-50"
                style={isAdmin
                  ? { border: "1.5px solid rgba(168,85,247,0.5)", boxShadow: "0 0 8px rgba(168,85,247,0.15)" }
                  : { border: "1px solid rgba(255,255,255,0.08)" }
                }
              />
              <button onClick={send} disabled={sending || !input.trim() || !myName}
                className="w-9 h-9 rounded-full text-black flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: "#a855f7", boxShadow: "0 0 10px rgba(168,85,247,0.5)" }}>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full text-black flex items-center justify-center hover:scale-105 transition-transform"
        style={{ background: "#a855f7", boxShadow: "0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(168,85,247,0.2)" }}>
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}

// ── Custom cursor ─────────────────────────────────────────────────────────────
function Cursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const move = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); };
    const hide = () => setVisible(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", hide);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseleave", hide); };
  }, []);
  return <div className="neon-cursor" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${visible ? 1 : 0})` }} />;
}

export function GlobalUI() { return <><Cursor /><LiveChatBubble /><ChatBot /></>; }
