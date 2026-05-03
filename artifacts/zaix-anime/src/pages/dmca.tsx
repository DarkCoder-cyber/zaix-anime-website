import { useLocation } from "wouter";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function DmcaPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black font-heading text-white">DMCA Policy</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-muted-foreground leading-relaxed">
          <p className="text-sm">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
            <p className="text-sm text-orange-200">
              <strong className="text-orange-400">Important:</strong> Zaix Anime does not host, upload, or store any copyrighted video content on our servers. We aggregate metadata through public APIs and embed third-party video players.
            </p>
          </div>

          {[
            ["Our Platform", "Zaix Anime is an anime and manga discovery platform. Anime metadata is sourced from Jikan (MyAnimeList's public API) and MangaDex. Any video streams are embedded from third-party sources and not hosted by us."],
            ["DMCA Compliance", "Zaix Anime respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). We respond to valid takedown notices as required by law."],
            ["Filing a DMCA Takedown Notice", "If you believe your copyrighted work has been infringed upon through our platform, please send a notice containing:\n\n• Your name, address, phone number, and email\n• Identification of the copyrighted work you claim has been infringed\n• A description of where the alleged infringing material is located on our site\n• A statement that you have a good faith belief that use of the material is not authorized\n• A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized agent\n• Your electronic or physical signature"],
            ["Counter-Notification", "If you believe your content was removed in error, you may file a counter-notification. Please include the same information as the original notice and a statement under penalty of perjury that the material was removed by mistake."],
            ["Repeat Infringer Policy", "In accordance with the DMCA, we maintain a policy to terminate users who are repeat infringers."],
            ["Contact for DMCA Notices", "Send all DMCA notices to: dmca@zaix.anime\n\nWe aim to respond to valid notices within 24–72 hours."],
          ].map(([title, body]) => (
            <div key={title as string}>
              <h2 className="text-white font-bold text-lg mb-2">{title}</h2>
              <p className="text-sm whitespace-pre-line">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
