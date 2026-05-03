import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatBot } from "@/components/chat-bot";

function LiveChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 1, user: "Neo", text: "This season is crazy 🔥" }, { id: 2, user: "Mika", text: "The neon UI goes hard" }]);
  const [input, setInput] = useState("");

  return <div className="fixed bottom-24 left-4 sm:left-6 z-50">{open && <div className="w-[92vw] max-w-sm sm:w-80 bg-black/95 border border-primary/30 rounded-2xl shadow-neon-intense overflow-hidden mb-3"><div className="px-4 py-3 border-b border-primary/20 flex items-center justify-between"><div className="flex items-center gap-2 text-primary font-bold text-sm"><MessageCircle className="w-4 h-4" /> Live Chat</div><button className="text-muted-foreground hover:text-white" onClick={() => setOpen(false)}>×</button></div><div className="h-56 overflow-y-auto p-3 space-y-2 text-sm hide-scrollbar">{messages.map((m) => <div key={m.id} className="bg-secondary/60 rounded-xl px-3 py-2"><span className="text-primary font-semibold">{m.user}:</span> <span className="text-white">{m.text}</span></div>)}</div><div className="p-3 border-t border-primary/15 flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message the room..." className="flex-1 bg-secondary border border-border rounded-full px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/60" /><button onClick={() => { if (!input.trim()) return; setMessages((m) => [...m, { id: Date.now(), user: "You", text: input.trim() }]); setInput(""); }} className="w-10 h-10 rounded-full bg-primary text-black shadow-neon flex items-center justify-center">↗</button></div></div>}<button onClick={() => setOpen((v) => !v)} className="w-14 h-14 rounded-full bg-primary text-black shadow-neon-intense flex items-center justify-center hover:scale-105 transition-transform"><MessageCircle className="w-6 h-6" /></button></div>;
}

function Cursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  useEffect(() => { const move = (e: MouseEvent) => { setPos({ x: e.clientX, y: e.clientY }); setVisible(true); }; const hide = () => setVisible(false); window.addEventListener("mousemove", move); window.addEventListener("mouseleave", hide); return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseleave", hide); }; }, []);
  return <div className="neon-cursor" style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${visible ? 1 : 0})` }} />;
}

export function GlobalUI() { return <><Cursor /><LiveChatBubble /><ChatBot /></>; }
