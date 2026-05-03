import { useEffect, useState, useRef, useCallback } from "react";
import { MessageCircle, Send } from "lucide-react";
import { ChatBot } from "@/components/chat-bot";
import { AdminCrown } from "@/components/admin-badge";
import { useAdmin } from "@/hooks/use-admin";

interface LiveMsg {
  id: number;
  userName: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

function LiveChatBubble() {
  const [open, setOpen] = useState(false);
  const { authenticated: isAdmin } = useAdmin();
  const [messages, setMessages] = useState<LiveMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    pollRef.current = setInterval(fetchMessages, 8000);
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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: isAdmin ? "zaix" : "You",
          message: text,
          isAdmin,
        }),
      });
      if (res.ok) await fetchMessages();
    } catch {} finally { setSending(false); }
  };

  return (
    <div className="fixed bottom-24 left-4 sm:left-6 z-50">
      {open && (
        <div className="w-[92vw] max-w-sm sm:w-80 bg-black/95 border border-primary/30 rounded-2xl shadow-neon-intense overflow-hidden mb-3">
          <div className="px-4 py-3 border-b border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <MessageCircle className="w-4 h-4" /> Live Chat
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
            <button className="text-muted-foreground hover:text-white text-lg leading-none" onClick={() => setOpen(false)}>×</button>
          </div>
          <div className="h-56 overflow-y-auto p-3 space-y-2 text-sm" style={{ scrollbarWidth: "none" }}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No messages yet. Say hello!</div>
            ) : messages.map((m) => (
              <div key={m.id} className="rounded-xl px-3 py-2"
                style={m.isAdmin ? {
                  background: "rgba(255,215,0,0.07)",
                  border: "1px solid rgba(255,215,0,0.35)",
                  boxShadow: "0 0 8px rgba(255,215,0,0.1)"
                } : { background: "rgba(255,255,255,0.05)" }}>
                <span className={`font-semibold inline-flex items-center gap-1.5 ${m.isAdmin ? "text-yellow-400" : "text-primary"}`}>
                  {m.isAdmin && <AdminCrown size="xs" />}
                  {m.userName}:
                </span>{" "}
                <span className={m.isAdmin ? "text-yellow-50 font-medium" : "text-white"}>{m.message}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-primary/15 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={isAdmin ? "Send as zaix (admin)..." : "Message the room..."}
              className="flex-1 bg-secondary rounded-full px-3 py-2 text-sm text-white focus:outline-none transition-colors"
              style={isAdmin ? { border: "1px solid rgba(255,215,0,0.4)" } : { border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <button onClick={send} disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full text-black shadow-neon flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity"
              style={{ background: "#39ff14" }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-primary text-black shadow-neon-intense flex items-center justify-center hover:scale-105 transition-transform">
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
}

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
