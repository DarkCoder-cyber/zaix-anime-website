import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import WatchPage from "@/pages/watch";
import MangaPage from "@/pages/manga";
import ReadPage from "@/pages/read";
import SchedulePage from "@/pages/schedule";
import WatchPartyPage from "@/pages/watch-party";
import AdminPage from "@/pages/admin";
import ProfilePage from "@/pages/profile";
import LeaderboardPage from "@/pages/leaderboard";
import TosPage from "@/pages/tos";
import DmcaPage from "@/pages/dmca";
import ContactPage from "@/pages/contact";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth-modal";
import { GlobalUI } from "@/components/global-ui";
import { GlobalAlertBanner } from "@/components/global-alert-banner";
import { isMaintenanceActive, isAdminAuthenticated } from "@/hooks/use-admin";
import { SplashScreen } from "@/components/splash-screen";
import { useEffect, useState, useCallback } from "react";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } } });

function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: "radial-gradient(circle, rgba(57,255,20,0.15) 0%, transparent 70%)", border: "2px solid rgba(57,255,20,0.4)", boxShadow: "0 0 40px rgba(57,255,20,0.3)" }}>
        <span className="text-5xl">⚡</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight mb-3" style={{ textShadow: "0 0 30px rgba(57,255,20,0.5)" }}>
        ZAIX <span style={{ color: "#39ff14" }}>ANIME</span>
      </h1>
      <p className="text-xl sm:text-2xl font-bold text-white/80 mb-3">Coming Back Soon</p>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">We're upgrading the platform. Hang tight — something awesome is on the way.</p>
      <div className="flex items-center gap-3 px-6 py-3 rounded-full border" style={{ borderColor: "rgba(57,255,20,0.3)", background: "rgba(57,255,20,0.05)" }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#39ff14", boxShadow: "0 0 8px #39ff14" }} />
        <span className="text-sm font-semibold" style={{ color: "#39ff14" }}>Maintenance in progress</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/watch/:id" component={WatchPage} />
      <Route path="/manga/:id" component={MangaPage} />
      <Route path="/read/:mangaId/:chapterId" component={ReadPage} />
      <Route path="/schedule" component={SchedulePage} />
      <Route path="/watch-party" component={WatchPartyPage} />
      <Route path="/xadmin" component={AdminPage} />
      <Route path="/profile/:username" component={ProfilePage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/tos" component={TosPage} />
      <Route path="/dmca" component={DmcaPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/categories" component={Home} />
      <Route path="/trending" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-black mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <div>
              <p className="font-heading text-2xl font-black text-white">ZAIX <span className="text-primary" style={{ textShadow: "0 0 12px #39ff14" }}>ANIME</span></p>
              <p className="text-xs text-muted-foreground mt-1">Stream. Binge. Discover.</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Your ultimate destination for anime, manga & manhwa. Community-driven, always free.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ boxShadow: "0 0 6px #39ff14" }} />
              <span className="text-xs text-muted-foreground">1,200+ fans watching right now</span>
            </div>
          </div>

          {/* Browse */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Browse</h4>
            <div className="flex flex-col gap-2">
              {[["🎌 Anime", "/"], ["📚 Manga", "/"], ["🇰🇷 Manhwa", "/"], ["🐉 Donghua", "/"], ["📅 Schedule", "/schedule"]].map(([label, href]) => (
                <Link key={label as string} href={href as string} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          {/* Community */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Community</h4>
            <div className="flex flex-col gap-2">
              {[["🎉 Watch Party", "/watch-party"], ["💬 Reviews", "/"], ["👥 Profiles", "/"], ["🏆 Trending", "/trending"]].map(([label, href]) => (
                <Link key={label as string} href={href as string} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Legal & Support</h4>
            <div className="flex flex-col gap-2">
              {[["📜 Terms of Service", "/tos"], ["⚠️ DMCA Policy", "/dmca"], ["✉️ Contact Us", "/contact"]].map(([label, href]) => (
                <Link key={label as string} href={href as string} className="text-sm text-muted-foreground hover:text-primary transition-colors">{label}</Link>
              ))}
              <a href="mailto:support@zaix.anime" className="text-sm text-muted-foreground hover:text-primary transition-colors">📧 support@zaix.anime</a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Zaix Anime. All rights reserved.</p>
          <p className="text-center">Anime data by <a href="https://jikan.moe" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary">Jikan/MAL</a> • Manga by <a href="https://mangadex.org" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary">MangaDex</a></p>
          <div className="flex items-center gap-3">
            <Link href="/tos" className="hover:text-primary transition-colors">Terms</Link>
            <span className="text-border">•</span>
            <Link href="/dmca" className="hover:text-primary transition-colors">DMCA</Link>
            <span className="text-border">•</span>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AppShell() {
  const [maintenance, setMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = () => {
      setMaintenance(isMaintenanceActive());
      setIsAdmin(isAdminAuthenticated());
    };
    check();
    const id = setInterval(check, 2000);
    return () => clearInterval(id);
  }, []);

  if (maintenance && !isAdmin) return <MaintenanceScreen />;

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black flex flex-col">
        <GlobalAlertBanner />
        <Navbar />
        <Router />
        <GlobalUI />
        <AuthModal />
        <Footer />
      </div>
    </WouterRouter>
  );
}

function App() {
  // Show splash on first visit in this session, or always when launched as standalone PWA
  const isPWA = typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
     (window.navigator as any).standalone === true);
  const [showSplash, setShowSplash] = useState(() => {
    if (isPWA) return true;
    const seen = sessionStorage.getItem("zaix_splash_seen");
    if (seen) return false;
    sessionStorage.setItem("zaix_splash_seen", "1");
    return true;
  });
  const handleSplashDone = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {showSplash && <SplashScreen onDone={handleSplashDone} />}
          <AppShell />
          <Toaster />
          <SonnerToaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: { background: "rgba(0,0,0,0.95)", border: "1px solid rgba(57,255,20,0.3)", color: "#fff", backdropFilter: "blur(12px)" },
            }}
          />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
