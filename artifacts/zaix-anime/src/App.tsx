import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import WatchPage from "@/pages/watch";
import { Navbar } from "@/components/navbar";
import { ChatBot } from "@/components/chat-bot";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth-modal";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/watch/:id" component={WatchPage} />
      {/* Catch-all for non-existing pages (like Categories/Trending nav links) */}
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
                  <p className="font-heading text-lg font-bold text-white mb-2">ZAIX <span className="text-primary text-shadow-neon">ANIME</span></p>
                  <p>© {new Date().getFullYear()} Zaix Anime. Stream. Binge. Discover.</p>
                </div>
              </footer>
            </div>
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
