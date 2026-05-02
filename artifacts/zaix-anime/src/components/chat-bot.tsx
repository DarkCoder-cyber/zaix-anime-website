import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

interface MessagePart {
  type: "text" | "link";
  content: string;
  href?: string;
}

interface Message {
  id: string;
  parts: MessagePart[];
  sender: "bot" | "user";
}

function textMsg(text: string): MessagePart[] {
  return [{ type: "text", content: text }];
}

function makeLink(label: string, href: string): MessagePart {
  return { type: "link", content: label, href };
}

const HELP_TOPICS: Record<string, string> = {
  buffer: "Buffering? Try switching providers using the neon buttons under the video player. Each button (2Embed, EmbedSu, VidSrc, SmashyStream) connects to a different server — one of them should work for your connection speed.",
  lag: "Buffering? Try switching providers using the neon buttons under the video player. Each button (2Embed, EmbedSu, VidSrc, SmashyStream) connects to a different server — one of them should work for your connection speed.",
  slow: "If a stream is slow, try a different provider using the buttons below the video player. You can also try 'Data Saver' mode in the manga reader for faster loading.",
  provider: "The video player has 4 providers: 2Embed, EmbedSu, VidSrc, and SmashyStream. If one shows a blank screen or error, just click another — they all carry the same episode.",
  stream: "Streaming issues? Click the neon provider buttons below the video player to switch servers. If all fail, the episode may not be available on any provider yet.",
  "black screen": "Black screen? Try a different provider using the buttons under the player. Some providers block certain regions — switching usually fixes it.",
  "not working": "If something isn't working, try: 1) Switching streaming provider (buttons under the player), 2) Refreshing the page, 3) Clearing browser cache. Let me know what's broken and I'll help!",
  read: "To read manga/manhwa: Go to the Manga or Manhwa tab on the home page, click any title, then click a chapter to open the in-app reader. You can switch between Scroll mode and Page mode at the top.",
  manga: "We support Manga (Japanese), Manhwa (Korean), and Manhua (Chinese). Find them on the home page tabs. Click a title to see chapters, then click any chapter to read inside the app!",
  manhwa: "Manhwa is Korean comics. Go to the Manhwa tab on the home page to browse popular titles. Click a chapter to read inside the app using our built-in reader.",
  donghua: "Donghua (Chinese animation) is in its own tab on the home page. Click any title to watch it with our multi-provider player.",
  chapter: "To jump to a specific chapter: open any manga/manhwa, scroll through the chapter list, and click the chapter number. The in-app reader will open immediately.",
  login: "To log in, click 'Login' in the top-right corner. Don't have an account? Click 'Sign Up' — it only takes a few seconds!",
  account: "Manage your account from the top-right menu after logging in. If you forgot your password, create a new account for now.",
  quality: "Video quality is controlled by your chosen provider. VidSrc and EmbedSu usually have the best quality. Switch providers using the buttons under the video player.",
  search: "Use the search bar at the top (magnifying glass icon) to search for Anime, Manga, or Manhwa by title. Results appear instantly as you type!",
  hello: "Hey! 👋 I'm Zaix AI. I can help you find anime/manga, fix streaming issues, or navigate the reader. What do you need?",
  hi: "Hey! 👋 I'm Zaix AI. I can help you find anime/manga, fix streaming issues, or navigate the reader. What do you need?",
  help: "I can help with:\n• Finding anime or manga\n• Fixing streaming/video issues\n• Using the manga reader\n• Account questions\n\nJust type your question!",
};

const ANIME_INTENT = /(?:find|search|watch|where|show me|looking for|recommend)\s+(.+?)(?:\s+anime)?$/i;
const MANGA_INTENT = /(?:find|search|read|where|show me|looking for)\s+(.+?)\s+(?:manga|manhwa|manhua)$/i;
const IS_MANGA_QUERY = /manga|manhwa|manhua/i;

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      parts: textMsg("👋 Hi! I'm Zaix AI. I can help you find anime, manga, fix streaming issues, or navigate the app. What do you need?"),
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const addBotMessage = (parts: MessagePart[]) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), parts, sender: "bot" },
    ]);
    setIsTyping(false);
  };

  const searchAnime = async (query: string) => {
    try {
      const res = await fetch(`/api/anime/search?q=${encodeURIComponent(query)}&limit=3`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      const results = data.data ?? [];

      if (!results.length) {
        addBotMessage(textMsg(`I couldn't find any anime matching "${query}". Try a different spelling or check the search bar at the top of the page!`));
        return;
      }

      const parts: MessagePart[] = [
        { type: "text", content: `Found ${results.length} results for "${query}":\n\n` },
      ];

      results.forEach((a: any, i: number) => {
        parts.push(makeLink(`${i + 1}. ${a.title} ${a.year ? `(${a.year})` : ""}`, `/watch/${a.malId}`));
        parts.push({ type: "text", content: `\n   ⭐ ${a.score?.toFixed(1) ?? "N/A"} • ${a.genres?.slice(0, 2).join(", ") ?? ""}\n\n` });
      });

      addBotMessage(parts);
    } catch (err: any) {
      addBotMessage(textMsg(`⚠️ The anime search API failed: ${err.message}. Please try using the search bar at the top of the page directly.`));
    }
  };

  const searchManga = async (query: string, type = "") => {
    try {
      const url = `/api/manga/search?q=${encodeURIComponent(query)}&limit=3${type ? `&type=${type}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`MangaDex returned ${res.status}`);
      const data = await res.json();
      const results = data.data ?? [];

      if (!results.length) {
        addBotMessage(textMsg(`I couldn't find any manga matching "${query}". Try the search bar at the top of the page for more results!`));
        return;
      }

      const parts: MessagePart[] = [
        { type: "text", content: `Found ${results.length} results for "${query}":\n\n` },
      ];

      results.forEach((m: any, i: number) => {
        parts.push(makeLink(`${i + 1}. ${m.title} [${m.type ?? "Manga"}]`, `/manga/${m.id}`));
        parts.push({ type: "text", content: `\n   ${m.status ? `• ${m.status}` : ""} ${m.genres?.slice(0, 2).join(", ") ?? ""}\n\n` });
      });

      addBotMessage(parts);
    } catch (err: any) {
      addBotMessage(
        textMsg(
          `⚠️ The MangaDex API failed to respond: ${err.message}.\n\nThis usually happens when MangaDex is rate-limiting requests. Please try again in a few seconds, or use the search bar at the top of the page.`
        )
      );
    }
  };

  const handleSend = async () => {
    const userMsg = input.trim();
    if (!userMsg) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), parts: textMsg(userMsg), sender: "user" },
    ]);
    setInput("");
    setIsTyping(true);

    const lower = userMsg.toLowerCase();

    // Check known help topics first
    for (const [keyword, response] of Object.entries(HELP_TOPICS)) {
      if (lower.includes(keyword)) {
        setTimeout(() => addBotMessage(textMsg(response)), 600);
        return;
      }
    }

    // Manga/manhwa search intent
    const mangaMatch = lower.match(MANGA_INTENT);
    if (mangaMatch) {
      const query = mangaMatch[1].trim();
      const type = lower.includes("manhwa") ? "manhwa" : lower.includes("manhua") ? "manhua" : "manga";
      await searchManga(query, type);
      return;
    }

    // General manga query without specific title
    if (IS_MANGA_QUERY.test(lower) && lower.split(" ").length > 1) {
      const q = lower.replace(/manga|manhwa|manhua|find|search|read/g, "").trim();
      if (q.length > 1) {
        await searchManga(q);
        return;
      }
    }

    // Anime search intent
    const animeMatch = lower.match(ANIME_INTENT);
    if (animeMatch) {
      const query = animeMatch[1].trim();
      await searchAnime(query);
      return;
    }

    // Generic search — try anime
    if (userMsg.split(" ").length <= 5 && !lower.includes("?") && userMsg.length > 2) {
      await searchAnime(userMsg);
      return;
    }

    // Default fallback
    setTimeout(() => {
      addBotMessage(
        textMsg(
          `I'm not sure how to help with that. Try asking me to:\n• "Find [anime name]"\n• "Search [manga name] manga"\n• "Fix streaming" or "black screen"\n• "How to read manga"\n\nOr just type an anime/manga name!`
        )
      );
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-black/40 backdrop-blur-xl border border-primary shadow-neon-intense rounded-2xl w-[320px] sm:w-[360px] mb-4 overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 120px)", height: "480px" }}
            data-testid="chatbot-window"
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Zaix AI</h3>
                  <p className="text-xs text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Online
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${msg.sender === "user" ? "ml-auto flex-row-reverse max-w-[85%]" : "max-w-[95%]"}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                        msg.sender === "user" ? "bg-secondary" : "bg-primary/20"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <User className="w-3 h-3 text-muted-foreground" />
                      ) : (
                        <Bot className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.sender === "user"
                          ? "bg-secondary text-foreground rounded-tr-sm"
                          : "bg-primary/10 text-foreground border border-primary/20 rounded-tl-sm"
                      }`}
                    >
                      {msg.parts.map((part, i) =>
                        part.type === "link" ? (
                          <button
                            key={i}
                            className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1 font-medium"
                            onClick={() => {
                              setLocation(part.href!);
                              setIsOpen(false);
                            }}
                          >
                            {part.content}
                            <ExternalLink className="w-3 h-3 inline" />
                          </button>
                        ) : (
                          <span key={i}>{part.content}</span>
                        )
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 bg-primary rounded-full" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick prompts */}
            <div className="px-3 pb-2 flex gap-2 flex-wrap shrink-0">
              {["Fix streaming", "Read manga", "Find anime"].map((p) => (
                <button
                  key={p}
                  onClick={() => { setInput(p); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-primary/20 bg-background/50 shrink-0">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="bg-black/50 border-primary/30 focus-visible:ring-primary text-sm h-10"
                  data-testid="chatbot-input"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 bg-primary text-black hover:bg-primary/90 shrink-0 shadow-neon"
                  disabled={!input.trim() || isTyping}
                  data-testid="chatbot-send"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-primary text-black hover:bg-primary/90 shadow-neon-intense hover:scale-105 transition-transform p-0"
        data-testid="chatbot-toggle"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </Button>
    </div>
  );
}
