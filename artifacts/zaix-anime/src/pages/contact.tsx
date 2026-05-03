import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, MessageSquare, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SUBJECTS = ["General Inquiry", "Bug Report", "DMCA / Copyright", "Account Issue", "Feature Request", "Business Inquiry", "Other"];

export default function ContactPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you soon.");
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-black font-heading text-white">Contact Us</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: "⚡", title: "Fast Response", desc: "We reply within 24–48 hours" },
            { icon: "🔒", title: "Secure", desc: "Your data stays private" },
            { icon: "🎌", title: "Community First", desc: "We love hearing from fans" },
          ].map(c => (
            <div key={c.title} className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">{c.icon}</div>
              <p className="text-sm font-bold text-white">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          {sent ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-neon">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-white">Message Sent!</h2>
              <p className="text-muted-foreground text-sm max-w-sm">Thanks for reaching out. Our team will get back to you at <strong className="text-white">{email}</strong> within 24–48 hours.</p>
              <Button className="bg-primary text-black hover:bg-primary/90 font-bold mt-2" onClick={() => setLocation("/")}>
                Back to Home
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Send us a message
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required maxLength={100}
                    className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Email *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                    className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary/60 transition-colors appearance-none">
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your inquiry in detail..." required rows={5} maxLength={2000}
                  className="bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none transition-colors" />
                <p className="text-[10px] text-muted-foreground text-right">{message.length}/2000</p>
              </div>
              <Button type="submit" disabled={sending} className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold h-11 gap-2">
                {sending ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
              </Button>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Prefer email? Reach us directly at <a href="mailto:support@zaix.anime" className="text-primary hover:underline">support@zaix.anime</a></p>
          <p className="mt-1">For copyright issues: <a href="/dmca" className="text-primary hover:underline">DMCA Policy</a></p>
        </div>
      </div>
    </div>
  );
}
