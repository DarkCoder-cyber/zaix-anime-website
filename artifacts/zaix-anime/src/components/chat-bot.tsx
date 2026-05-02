import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  text: string;
  sender: "bot" | "user";
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", text: "👋 Hi! I'm Zaix AI. Having issues with streaming? I'm here to help!", sender: "bot" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, sender: "user" }]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      let botResponse = "I'm sorry, I didn't quite catch that. Could you rephrase?";
      const lowerInput = userMsg.toLowerCase();
      
      if (lowerInput.includes("buffer") || lowerInput.includes("lag") || lowerInput.includes("slow")) {
        botResponse = "Buffering issues? Try lowering the video quality in the player settings, or check your internet connection speed.";
      } else if (lowerInput.includes("quality") || lowerInput.includes("resolution") || lowerInput.includes("hd")) {
        botResponse = "You can change video quality by clicking the gear icon on the video player. We support up to 1080p for premium users!";
      } else if (lowerInput.includes("login") || lowerInput.includes("password") || lowerInput.includes("account")) {
        botResponse = "If you're having trouble logging in, try resetting your password using the 'Forgot Password' link on the login page.";
      } else if (lowerInput.includes("sub") || lowerInput.includes("dub") || lowerInput.includes("language")) {
        botResponse = "You can toggle subtitles and audio language from the CC/Audio menu in the player controls.";
      } else if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
        botResponse = "Hello there! Ready to watch some anime? Let me know if you need help finding anything.";
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), text: botResponse, sender: "bot" }]);
      setIsTyping(false);
    }, 1000);
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
            className="bg-black/40 backdrop-blur-xl border border-primary shadow-neon-intense rounded-2xl w-[320px] sm:w-[350px] mb-4 overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 120px)", height: "450px" }}
            data-testid="chatbot-window"
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-primary/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Zaix AI Support</h3>
                  <p className="text-xs text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Online
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : ""}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === "user" ? "bg-secondary" : "bg-primary/20"}`}>
                      {msg.sender === "user" ? <User className="w-3 h-3 text-muted-foreground" /> : <Bot className="w-3 h-3 text-primary" />}
                    </div>
                    <div
                      className={`p-3 rounded-2xl text-sm ${
                        msg.sender === "user"
                          ? "bg-secondary text-foreground rounded-tr-sm"
                          : "bg-primary/10 text-foreground border border-primary/20 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
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

            {/* Input */}
            <div className="p-3 border-t border-primary/20 bg-background/50">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-black/50 border-primary/30 focus-visible:ring-primary text-sm h-10"
                  data-testid="chatbot-input"
                />
                <Button type="submit" size="icon" className="h-10 w-10 bg-primary text-black hover:bg-primary/90 shrink-0 shadow-neon" disabled={!input.trim()} data-testid="chatbot-send">
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
