import { Link, useLocation } from "wouter";
import { Menu, Search, User, LogOut, ChevronDown, X, Star, BookOpen, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

type SearchType = "all" | "anime" | "manga" | "manhwa";

async function searchAnime(q: string) {
  const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}&limit=4`);
  if (!res.ok) return { data: [] };
  return res.json();
}

async function searchManga(q: string, type = "") {
  const url = `/api/manga/search?q=${encodeURIComponent(q)}&limit=4${type ? `&type=${type}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, logout, setModalOpen, setModalTab } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const isQueryActive = debouncedQuery.length > 2;
  const showAnime = searchType === "all" || searchType === "anime";
  const showManga = searchType === "all" || searchType === "manga";
  const showManhwa = searchType === "manhwa";

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["navbar-search-anime", debouncedQuery],
    queryFn: () => searchAnime(debouncedQuery),
    enabled: isQueryActive && showAnime,
  });

  const { data: mangaData, isLoading: mangaLoading } = useQuery({
    queryKey: ["navbar-search-manga", debouncedQuery, searchType],
    queryFn: () => searchManga(debouncedQuery, showManhwa ? "manhwa" : ""),
    enabled: isQueryActive && (showManga || showManhwa),
  });

  const animeResults = animeData?.data ?? [];
  const mangaResults = mangaData?.data ?? [];
  const isLoading = animeLoading || mangaLoading;
  const hasResults = animeResults.length > 0 || mangaResults.length > 0;

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/categories", label: "Categories" },
    { href: "/trending", label: "Trending" },
  ];

  const searchTypeTabs: { key: SearchType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "anime", label: "Anime" },
    { key: "manga", label: "Manga" },
    { key: "manhwa", label: "Manhwa" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        isScrolled
          ? "bg-black/80 backdrop-blur-md border-primary/50 shadow-neon"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-2xl font-bold font-heading text-primary text-shadow-neon tracking-wider"
            data-testid="link-home-logo"
          >
            ZAIX
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary relative group ${
                  location === link.href ? "text-primary" : "text-foreground/80"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full shadow-neon" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            {!searchOpen ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground/80 hover:text-primary hover:bg-primary/10"
                onClick={() => setSearchOpen(true)}
                data-testid="button-search-open"
              >
                <Search className="h-5 w-5" />
              </Button>
            ) : (
              <div className="flex items-center animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative w-48 sm:w-64 md:w-80">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder={`Search ${searchType === "all" ? "anime, manga..." : searchType + "..."}`}
                    className="pl-9 pr-9 bg-black/60 border-primary/50 focus-visible:ring-primary/50 text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-white"
                    onClick={closeSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Dropdown */}
            {searchOpen && (
              <div className="absolute top-full mt-2 right-0 w-80 md:w-[420px] bg-black/95 backdrop-blur-xl border border-primary/30 rounded-xl overflow-hidden shadow-neon-intense z-50">
                {/* Type tabs */}
                <div className="flex border-b border-primary/10 px-2 pt-2 gap-1">
                  {searchTypeTabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSearchType(t.key)}
                      className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${
                        searchType === t.key
                          ? "bg-primary/15 text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {!isQueryActive ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Type at least 3 characters to search...
                  </div>
                ) : isLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : !hasResults ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No results for "{debouncedQuery}"
                  </div>
                ) : (
                  <div className="max-h-[440px] overflow-y-auto custom-scrollbar py-1">
                    {/* Anime results */}
                    {showAnime && animeResults.length > 0 && (
                      <>
                        {searchType === "all" && (
                          <div className="px-4 py-2 flex items-center gap-2">
                            <PlayCircle className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Anime</span>
                          </div>
                        )}
                        {animeResults.map((anime: any) => (
                          <button
                            key={anime.malId}
                            className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-3 border-b border-primary/5 last:border-0"
                            onClick={() => { setLocation(`/watch/${anime.malId}`); closeSearch(); }}
                            data-testid={`search-result-${anime.malId}`}
                          >
                            <img
                              src={anime.image}
                              alt={anime.title}
                              className="w-9 h-12 object-cover rounded shadow-sm bg-secondary shrink-0"
                            />
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <h4 className="text-sm font-bold text-white line-clamp-1">{anime.title}</h4>
                              <div className="flex items-center gap-2">
                                {anime.year && <span className="text-xs text-muted-foreground">{anime.year}</span>}
                                <span className="text-xs text-primary font-medium flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-primary" /> {anime.score?.toFixed(1) || "N/A"}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {anime.genres?.slice(0, 2).map((g: string) => (
                                  <Badge key={g} variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 border-primary/20 text-primary/80">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}

                    {/* Manga / Manhwa results */}
                    {(showManga || showManhwa) && mangaResults.length > 0 && (
                      <>
                        {searchType === "all" && (
                          <div className="px-4 py-2 flex items-center gap-2 mt-1">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                              Manga / Manhwa
                            </span>
                          </div>
                        )}
                        {mangaResults.map((m: any) => (
                          <button
                            key={m.id}
                            className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-3 border-b border-primary/5 last:border-0"
                            onClick={() => { setLocation(`/manga/${m.id}`); closeSearch(); }}
                          >
                            {m.image ? (
                              <img
                                src={m.image}
                                alt={m.title}
                                className="w-9 h-12 object-cover rounded shadow-sm bg-secondary shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-12 bg-secondary rounded flex items-center justify-center shrink-0">
                                <BookOpen className="w-4 h-4 text-primary/40" />
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <h4 className="text-sm font-bold text-white line-clamp-1">{m.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${
                                  m.type === "Manhwa" ? "bg-blue-500/20 text-blue-400" : "bg-primary/20 text-primary"
                                }`}>
                                  {m.type ?? "Manga"}
                                </Badge>
                                {m.status && (
                                  <span className="text-xs text-muted-foreground capitalize">{m.status}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {m.genres?.slice(0, 2).map((g: string) => (
                                  <Badge key={g} variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 border-primary/20 text-primary/80">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auth */}
          <div className="hidden md:flex items-center gap-4">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="h-8 w-8 border border-primary/50">
                      <AvatarFallback className="bg-black text-primary font-heading">
                        {user?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium" data-testid="text-username">{user?.username}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-black/90 backdrop-blur-xl border-primary/30">
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="hover:text-primary hover:bg-primary/10"
                  onClick={() => { setModalTab("login"); setModalOpen(true); }}
                  data-testid="button-login"
                >
                  Login
                </Button>
                <Button
                  className="bg-primary text-black hover:bg-primary/90 shadow-neon"
                  onClick={() => { setModalTab("register"); setModalOpen(true); }}
                  data-testid="button-signup"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-foreground hover:text-primary"
                data-testid="button-mobile-menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card/95 backdrop-blur-xl border-primary/20">
              <nav className="flex flex-col gap-6 mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg font-medium hover:text-primary transition-colors"
                    data-testid={`link-mobile-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-border my-4" />
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2 border border-primary/20 rounded-md bg-black/40">
                      <Avatar className="h-10 w-10 border border-primary/50">
                        <AvatarFallback className="bg-black text-primary font-heading">
                          {user?.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-lg" data-testid="text-mobile-username">
                        {user?.username}
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full justify-start mt-2"
                      onClick={() => logout()}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => { setModalTab("login"); setModalOpen(true); }}
                      data-testid="button-mobile-login"
                    >
                      Login
                    </Button>
                    <Button
                      className="w-full bg-primary text-black shadow-neon justify-start"
                      onClick={() => { setModalTab("register"); setModalOpen(true); }}
                      data-testid="button-mobile-signup"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
