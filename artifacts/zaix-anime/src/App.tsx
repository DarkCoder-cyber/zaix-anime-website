import { Switch, Route, Router as WouterRouter } from "wouter";
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
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth-modal";
import { GlobalUI } from "@/components/global-ui";
import { GlobalAlertBanner } from "@/components/global-alert-banner";
import { isMaintenanceActive, isAdminAuthenticated } from "@/hooks/use-admin";
import { useEffect, useState } from "react";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } } });

function MaintenanceScreen() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: "radial-gradient(circle, rgba(57,255,20,0.15) 0%, transparent 70%)", border: "2px solid rgba(57,255,20,0.4)", boxShadow: "0 0 40px rgba(57,255,20,0.3)" }}>
        <span className="text-5xl">⚡</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight mb-3"
        style={{ textShadow: "0 0 30px rgba(57,255,20,0.5)" }}>
        ZAIX <span style={{ color: "#39ff14" }}>ANIME</span>
      </h1>
      <p className="text-xl sm:text-2xl font-bold text-white/80 mb-3">Coming Back Soon</p>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        We're upgrading the platform. Hang tight — something awesome is on the way.
      </p>
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
      <Route path="/categories" component={Home} />
      <Route path="/trending" component={Home} />
      <Route component={NotFound} />
    </Switch>
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
        <footer className="border-t border-primary/20 bg-black py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
            <p className="font-heading text-lg font-bold text-white mb-2">ZAIX <span className="text-primary text-shadow-neon">ANIME</span></p>
            <p className="mb-1">© {new Date().getFullYear()} Zaix Anime. Stream. Binge. Discover.</p>
            <p className="text-xs opacity-60">Anime data by Jikan/MAL • Manga/Manhwa data by MangaDex</p>
          </div>
        </footer>
      </div>
    </WouterRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
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
