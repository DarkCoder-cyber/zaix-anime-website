import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "@/components/anime-card";
import { CATEGORIES } from "@/data/mock";
import { useGetTrendingAnime, useGetRecentAnime, getGetTrendingAnimeQueryKey, getGetRecentAnimeQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import heroBg from "@/assets/hero-bg.png";

export default function Home() {
  const { data: trendingData, isLoading: trendingLoading } = useGetTrendingAnime({ limit: 12 }, { query: { queryKey: getGetTrendingAnimeQueryKey({ limit: 12 }) }});
  const { data: recentData, isLoading: recentLoading } = useGetRecentAnime({ limit: 8 }, { query: { queryKey: getGetRecentAnimeQueryKey({ limit: 8 }) }});
  
  const trendingAnime = trendingData?.data ?? [];
  const recentAnime = recentData?.data ?? [];

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Naruto Hero Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        </div>
        
        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center mt-16">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-heading text-white tracking-tight mb-4 text-shadow-neon">
            ZAIX <span className="text-primary">ANIME</span>
          </h1>
          <p className="text-xl md:text-2xl text-foreground/90 font-medium mb-8 max-w-2xl text-shadow-neon">
            Stream. Binge. Discover.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
            <Button size="lg" className="w-full sm:w-auto bg-primary text-black hover:bg-primary/90 shadow-neon font-bold text-lg h-14 px-8" data-testid="btn-hero-browse">
              Browse Now
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/50 text-white hover:bg-primary/10 hover:text-primary backdrop-blur-sm h-14 px-8" data-testid="btn-hero-learn">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Pills */}
      <section className="py-8 border-b border-border/50 bg-black/50 backdrop-blur-md sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                className="whitespace-nowrap px-5 py-2 rounded-full border border-primary/30 text-sm font-medium text-foreground/80 hover:bg-primary hover:text-black hover:border-primary transition-all shadow-[0_0_10px_rgba(57,255,20,0)] hover:shadow-neon snap-center"
                data-testid={`pill-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-16 container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-bold font-heading text-white flex items-center gap-2">
            🔥 Trending Now
          </h2>
          <div className="h-px bg-primary/50 flex-1 shadow-neon mt-2" />
        </div>
        
        <div className="flex overflow-x-auto gap-6 pb-8 snap-x -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
          {trendingLoading ? Array.from({length: 6}).map((_, i) => (
            <div key={i} className="w-[240px] sm:w-[280px] shrink-0">
              <Skeleton className="w-full aspect-[3/4] rounded-xl" />
            </div>
          )) : trendingAnime.map((anime, i) => (
            <div key={`trending-${anime.malId}-${i}`} className="w-[240px] sm:w-[280px] shrink-0 snap-start">
              <AnimeCard anime={anime} layout="trending" />
            </div>
          ))}
        </div>
      </section>

      {/* New Releases Section */}
      <section className="py-16 container mx-auto px-4 bg-gradient-to-b from-transparent to-primary/5 rounded-3xl mb-12">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-bold font-heading text-white flex items-center gap-2">
            <span className="text-primary animate-pulse">✨</span> New Releases
          </h2>
          <div className="h-px bg-primary/50 flex-1 shadow-neon mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentLoading ? Array.from({length: 8}).map((_, i) => (
            <div key={i} className="w-full">
              <Skeleton className="w-full aspect-[3/4] rounded-xl" />
            </div>
          )) : recentAnime.map((anime, i) => (
            <div key={`recent-${anime.malId}-${i}`}>
              <AnimeCard anime={{...anime, isNew: true}} layout="new" />
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 shadow-[inset_0_0_10px_rgba(57,255,20,0.1)] hover:shadow-neon" data-testid="btn-view-all-new">
            View All Releases
          </Button>
        </div>
      </section>
    </main>
  );
}
