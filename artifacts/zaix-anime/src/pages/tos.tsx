import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function TosPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background pt-20 pb-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <button onClick={() => setLocation("/")} className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-black font-heading text-white">Terms of Service</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6 text-muted-foreground leading-relaxed">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          {[
            ["1. Acceptance of Terms", "By accessing and using Zaix Anime, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform."],
            ["2. Use of the Service", "Zaix Anime is provided for personal, non-commercial entertainment purposes only. You agree not to use the service for any unlawful purpose or in any way that could damage, disable, or impair the service."],
            ["3. User Accounts", "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts that violate these terms."],
            ["4. Content", "Zaix Anime aggregates publicly available anime and manga data through third-party APIs including Jikan (MyAnimeList) and MangaDex. We do not host any copyrighted video content directly. All streaming is provided through embedded third-party players."],
            ["5. User-Generated Content", "Reviews and comments submitted by users remain the responsibility of those users. We reserve the right to remove content that violates our community guidelines, including hate speech, spam, or explicit material."],
            ["6. Third-Party Services", "Our platform integrates with third-party services including Jikan API, MangaDex API, and various video streaming embeds. We are not responsible for the content, privacy practices, or availability of these third-party services."],
            ["7. Disclaimer of Warranties", "The service is provided 'as is' without warranties of any kind. We do not guarantee uninterrupted access or that the service will be error-free."],
            ["8. Limitation of Liability", "To the fullest extent permitted by law, Zaix Anime shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service."],
            ["9. Changes to Terms", "We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms."],
            ["10. Contact", "For questions about these Terms of Service, please contact us at support@zaix.anime."],
          ].map(([title, body]) => (
            <div key={title as string}>
              <h2 className="text-white font-bold text-lg mb-2">{title}</h2>
              <p className="text-sm">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
