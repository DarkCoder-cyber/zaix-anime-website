import { Link, useLocation } from "wouter";
import { Menu, Search, User, LogOut, ChevronDown, X, Star, BookOpen, PlayCircle, SlidersHorizontal, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { NotificationBell } from "@/components/notification-bell";
import { MusicPlayer } from "@/components/music-player";
import { ProfileModal } from "@/components/profile-modal";
import { useProfile } from "@/hooks/use-local-store";

type SearchType = "all" | "anime" | "manga" | "manhwa";
type LangFilter = "sub" | "dub" | "hindi";
type SortFilter = "" | "score" | "members" | "start_date";

const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Thriller", "Mecha", "School", "Isekai", "Military", "Shounen", "Seinen",
];

const SORT_OPTIONS: { key: SortFilter; label: string }[] = [
  { key: "", label: "Relevance" },
  { key: "score", label: "Top Rated" },
  { key: "members", label: "Most Popular" },
  { key: "start_date", label: "Newest" },
];

const YEAR_OPTIONS = [
  "", "2025", "2024", "2023", "2022", "2021", "2020",
  "2019", "2018", "2017", "2015", "2010", "2005", "2000",
];

async function searchAnime(q: string, genre = "", year = "", orderBy = "", minScore = "") {
  let url = `/api/anime/search?q=${encodeURIComponent(q)}&limit=5`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  if (year) url += `&year=${year}`;
  if (orderBy) url += `&orderBy=${orderBy}`;
  if (minScore) url += `&minScore=${minScore}`;
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

async function searchManga(q: string, type = "") {
  const url = `/api/manga/search?q=${encodeURIComponent(q)}&limit=4${type ? `&type=${type}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

function NavAvatar({ avatar }: { avatar: string }) {
  const isDataUrl = avatar.startsWith("data:");
  return (
    <div className="w-8 h-8 rounded-full border border-primary/60 bg-black/60 flex items-center justify-center overflow-hidden shadow-neon shrink-0">
      {isDataUrl ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-base leading-none">{avatar}</span>}
    </div>
  );
}

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isLoggedIn, logout, setModalOpen, setModalTab } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [profileOpen, setProfileOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { profile } = useProfile();

  // Filter state
  const [langFilter, setLangFilter] = useState<LangFilter>("sub");
  const [genreFilter, setGenreFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sortFilter, setSortFilter] = useState<SortFilter>("");
  const [minScoreFilter, setMinScoreFilter] = useState("");

  const hasActiveFilters = !!(genreFilter || yearFilter || sortFilter || minScoreFilter);

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
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
    };
    const handleEsc = (event: KeyboardEvent) => { if (event.key === "Escape") setSearchOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => { document.removeEventListener("mousedown", handleClickOutside); document.removeEventListener("keydown", handleEsc); };
  }, []);

  const isQueryActive = debouncedQuery.length > 2;
  const showAnime = searchType === "all" || searchType === "anime";
  const showManga = searchType === "all" || searchType === "manga";
  const showManhwa = searchType === "manhwa";

  const { data: animeData, isLoading: animeLoading } = useQuery({
    queryKey: ["navbar-search-anime", debouncedQuery, genreFilter, yearFilter, sortFilter, minScoreFilter],
    queryFn: () => searchAnime(debouncedQuery, genreFilter, yearFilter, sortFilter, minScoreFilter),
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

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };
  const clearFilters = () => { setGenreFilter(""); setYearFilter(""); setSortFilter(""); setMinScoreFilter(""); };

  const navLinks = [
    { href: "/", label: "Home", icon: null },
    { href: "/movies", label: "Movies", icon: Clapperboard },
    { href: "/categories", label: "Categories", icon: null },
    { href: "/trending", label: "Trending", icon: null },
    { href: "/leaderboard", label: "Leaderboard", icon: null },
    { href: "/schedule", label: "Schedule", icon: null },
    { href: "/watch-party", label: "Watch Party", icon: null },
  ];

  const searchTypeTabs: { key: SearchType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "anime", label: "Anime" },
    { key: "manga", label: "Manga" },
    { key: "manhwa", label: "Manhwa" },
  ];

  const LANG_TABS: { key: LangFilter; label: string }[] = [
    { key: "sub", label: "Sub" },
    { key: "dub", label: "Eng Dub" },
    { key: "hindi", label: "Hindi Dub" },
  ];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${isScrolled ? "border-primary/40 shadow-neon" : "bg-transparent border-transparent"}`}
        style={isScrolled ? { background: "rgba(0,0,0,0.75)", backdropFilter: "blur(24px) saturate(200%)", WebkitBackdropFilter: "blur(24px) saturate(200%)", boxShadow: "0 0 30px rgba(168,85,247,0.08), inset 0 -1px 0 rgba(168,85,247,0.2)" } : undefined}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold font-heading text-primary text-shadow-neon tracking-wider" data-testid="link-home-logo">ZAIX</Link>
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary relative group flex items-center gap-1.5 ${location === link.href ? "text-primary" : "text-foreground/80"}`}
                  data-testid={`link-nav-${link.label.toLowerCase()}`}>
                  {link.icon && <link.icon className="w-3.5 h-3.5 shrink-0" />}
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full shadow-neon" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              {!searchOpen ? (
                <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-primary hover:bg-primary/10"
                  onClick={() => setSearchOpen(true)} data-testid="button-search-open">
                  <Search className="h-5 w-5" />
                </Button>
              ) : (
                <div className="flex items-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="relative w-48 sm:w-64 md:w-80">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#b3b3b3]" />
                    <Input autoFocus
                      placeholder={`Search ${searchType === "all" ? "anime, manga..." : searchType + "..."}`}
                      className="pl-9 pr-9 bg-black/60 border-primary/50 focus-visible:ring-primary/50 text-white"
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search" />
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-[#b3b3b3] hover:text-white" onClick={closeSearch}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Search dropdown */}
              {searchOpen && (
                <div className="absolute top-full mt-2 right-0 w-80 md:w-[460px] bg-black/95 backdrop-blur-xl border border-primary/30 rounded-xl overflow-hidden shadow-neon-intense z-50">
                  {/* Type tabs */}
                  <div className="flex border-b border-primary/10 px-2 pt-2 gap-1">
                    {searchTypeTabs.map((t) => (
                      <button key={t.key} onClick={() => setSearchType(t.key)}
                        className={`px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors ${searchType === t.key ? "bg-primary/15 text-primary border-b-2 border-primary" : "text-[#b3b3b3] hover:text-white"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Language + filter toggle row */}
                  {(searchType === "all" || searchType === "anime") && (
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-black/30 flex-wrap">
                      <span className="text-[10px] text-[#b3b3b3] uppercase tracking-widest mr-0.5 shrink-0">Lang:</span>
                      {LANG_TABS.map((l) => (
                        <button key={l.key} onClick={() => setLangFilter(l.key)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${langFilter === l.key ? "bg-primary/20 text-primary border-primary/50 shadow-neon" : "border-border text-[#b3b3b3] hover:text-white hover:border-white/30"}`}>
                          {l.label}
                        </button>
                      ))}
                      <div className="flex-1" />
                      <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${showFilters || hasActiveFilters ? "bg-primary/15 text-primary border-primary/50" : "border-border text-[#b3b3b3] hover:text-white"}`}
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        Filters{hasActiveFilters ? ` (${[genreFilter, yearFilter, sortFilter, minScoreFilter].filter(Boolean).length})` : ""}
                      </button>
                    </div>
                  )}

                  {/* Advanced filters panel */}
                  {showFilters && (searchType === "all" || searchType === "anime") && (
                    <div className="px-3 py-3 border-b border-primary/10 bg-primary/5 flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Genre */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-wider">Genre</label>
                          <div className="relative">
                            <select value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
                              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-primary/60">
                              <option value="">Any Genre</option>
                              {ANIME_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#b3b3b3] pointer-events-none" />
                          </div>
                        </div>
                        {/* Year */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-wider">Year</label>
                          <div className="relative">
                            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-primary/60">
                              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y || "Any Year"}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#b3b3b3] pointer-events-none" />
                          </div>
                        </div>
                        {/* Sort */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-wider">Sort By</label>
                          <div className="relative">
                            <select value={sortFilter} onChange={e => setSortFilter(e.target.value as SortFilter)}
                              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-primary/60">
                              {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#b3b3b3] pointer-events-none" />
                          </div>
                        </div>
                        {/* Min Score */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#b3b3b3] uppercase tracking-wider">Min Rating</label>
                          <div className="relative">
                            <select value={minScoreFilter} onChange={e => setMinScoreFilter(e.target.value)}
                              className="w-full bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-white appearance-none focus:outline-none focus:border-primary/60">
                              <option value="">Any Score</option>
                              {["9", "8", "7", "6", "5"].map(s => <option key={s} value={s}>{s}+ Stars</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#b3b3b3] pointer-events-none" />
                          </div>
                        </div>
                      </div>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-semibold text-left flex items-center gap-1">
                          <X className="w-3 h-3" /> Clear all filters
                        </button>
                      )}
                    </div>
                  )}

                  {/* Results */}
                  {!isQueryActive ? (
                    <div className="p-4 text-center text-[#b3b3b3] text-sm">Type at least 3 characters to search...</div>
                  ) : isLoading ? (
                    <div className="p-6 text-center text-[#b3b3b3] text-sm flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Searching{genreFilter ? ` in ${genreFilter}` : ""}{yearFilter ? ` (${yearFilter})` : ""}…
                    </div>
                  ) : !hasResults ? (
                    <div className="p-6 text-center text-[#b3b3b3] text-sm">
                      No results for "{debouncedQuery}"{genreFilter ? ` in ${genreFilter}` : ""}
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar py-1">
                      {showAnime && animeResults.length > 0 && (
                        <>
                          {searchType === "all" && (
                            <div className="px-4 py-2 flex items-center gap-2">
                              <PlayCircle className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Anime</span>
                              {genreFilter && <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/80 bg-primary/5 px-1.5">{genreFilter}</Badge>}
                              {yearFilter && <Badge variant="outline" className="text-[9px] border-primary/30 text-primary/80 bg-primary/5 px-1.5">{yearFilter}</Badge>}
                            </div>
                          )}
                          {animeResults.map((anime: any) => (
                            <button key={anime.malId}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-3 border-b border-primary/5 last:border-0"
                              onClick={() => { setLocation(`/watch/${anime.malId}`); closeSearch(); }}
                              data-testid={`search-result-${anime.malId}`}>
                              <img src={anime.image} alt={anime.title} className="w-9 h-12 object-cover rounded shadow-sm bg-secondary shrink-0" />
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <h4 className="text-sm font-bold text-white line-clamp-1">{anime.title}</h4>
                                <div className="flex items-center gap-2">
                                  {anime.year && <span className="text-xs text-[#b3b3b3]">{anime.year}</span>}
                                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-primary" /> {anime.score?.toFixed(1) || "N/A"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {anime.genres?.slice(0, 2).map((g: string) => (
                                    <Badge key={g} variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 border-primary/20 text-primary/80">{g}</Badge>
                                  ))}
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                      {(showManga || showManhwa) && mangaResults.length > 0 && (
                        <>
                          {searchType === "all" && (
                            <div className="px-4 py-2 flex items-center gap-2 mt-1">
                              <BookOpen className="w-3.5 h-3.5 text-primary" />
                              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Manga / Manhwa</span>
                            </div>
                          )}
                          {mangaResults.map((m: any) => (
                            <button key={m.id}
                              className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors flex items-start gap-3 border-b border-primary/5 last:border-0"
                              onClick={() => { setLocation(`/manga/${m.id}`); closeSearch(); }}>
                              {m.image ? (
                                <img src={m.image} alt={m.title} className="w-9 h-12 object-cover rounded shadow-sm bg-secondary shrink-0" />
                              ) : (
                                <div className="w-9 h-12 bg-secondary rounded flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-primary/40" />
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <h4 className="text-sm font-bold text-white line-clamp-1">{m.title}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[9px] px-1.5 py-0 h-4 font-semibold ${m.type === "Manhwa" ? "bg-blue-500/20 text-blue-400" : "bg-primary/20 text-primary"}`}>
                                    {m.type ?? "Manga"}
                                  </Badge>
                                  {m.status && <span className="text-xs text-[#b3b3b3] capitalize">{m.status}</span>}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {m.genres?.slice(0, 2).map((g: string) => (
                                    <Badge key={g} variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/5 border-primary/20 text-primary/80">{g}</Badge>
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

            <MusicPlayer />
            <NotificationBell />

            <button onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors group"
              title="View Profile" data-testid="button-profile">
              <NavAvatar avatar={profile.avatar} />
              <span className="hidden md:block text-sm font-medium text-foreground/80 group-hover:text-primary transition-colors max-w-[72px] truncate">
                {profile.username}
              </span>
            </button>

            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary px-2" data-testid="button-user-menu">
                      <span className="font-medium text-sm" data-testid="text-username">{user?.username}</span>
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-black/90 backdrop-blur-xl border-primary/30">
                    <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" data-testid="menu-logout">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button variant="ghost" size="sm" className="hover:text-primary hover:bg-primary/10"
                    onClick={() => { setModalTab("login"); setModalOpen(true); }} data-testid="button-login">Login</Button>
                  <Button size="sm" className="bg-primary text-black hover:bg-primary/90 shadow-neon"
                    onClick={() => { setModalTab("register"); setModalOpen(true); }} data-testid="button-signup">Sign Up</Button>
                </>
              )}
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-foreground hover:text-primary" data-testid="button-mobile-menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-card/95 backdrop-blur-xl border-primary/20">
                <nav className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="flex items-center gap-2.5 text-lg font-medium hover:text-primary transition-colors" data-testid={`link-mobile-${link.label.toLowerCase()}`}>
                      {link.icon && <link.icon className="w-5 h-5 shrink-0" />}
                      {link.label}
                    </Link>
                  ))}
                  <button onClick={() => setProfileOpen(true)} className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors text-left">
                    <User className="w-5 h-5" /> View Profile
                  </button>
                  <div className="h-px bg-border my-2" />
                  {isLoggedIn ? (
                    <Button variant="destructive" className="w-full justify-start" onClick={() => logout()} data-testid="button-mobile-logout">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full justify-start" onClick={() => { setModalTab("login"); setModalOpen(true); }} data-testid="button-mobile-login">Login</Button>
                      <Button className="w-full bg-primary text-black shadow-neon justify-start" onClick={() => { setModalTab("register"); setModalOpen(true); }} data-testid="button-mobile-signup">Sign Up</Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
