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
import { Navbar } from "@/components/navbar";
import { ChatBot } from "@/components/chat-bot";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth-modal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/watch/:id" component={WatchPage} />
      <Route path="/manga/:id" component={MangaPage} />
      <Route path="/read/:mangaId/:chapterId" component={ReadPage} />
      <Route path="/categories" component={Home} />
      <Route path="/trending" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-black">
              <Navbar />
              <Router />
              <ChatBot />
              <AuthModal />

              <footer className="border-t border-primary/20 bg-black py-8 mt-auto">
                <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
                  <p className="font-heading text-lg font-bold text-white mb-2">
                    ZAIX <span className="text-primary text-shadow-neon">ANIME</span>
                  </p>
                  <p className="mb-1">© {new Date().getFullYear()} Zaix Anime. Stream. Binge. Discover.</p>
                  <p className="text-xs opacity-60">
                    Anime data by Jikan/MAL • Manga/Manhwa data by MangaDex
                  </p>
                </div>
              </footer>
            </div>
          </WouterRouter>
          <Toaster />
          <SonnerToaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                background: "rgba(0,0,0,0.95)",
                border: "1px solid rgba(57,255,20,0.3)",
                color: "#fff",
                backdropFilter: "blur(12px)",
              },
            }}
          />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
