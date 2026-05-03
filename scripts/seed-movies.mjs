import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const movies = [
  {
    title: "KGF: Chapter 2",
    poster: "https://m.media-amazon.com/images/M/MV5BOWI0NWFiMWMtNDMzNS00YjYwLWI5YmYtNTMwNzNhMTBhOTJkXkEyXkFqcGdeQXVyMTEzNzg0Mjkx._V1_SX300.jpg",
    backdrop_url: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1920&q=80&auto=format&fit=crop",
    stream_url: "https://www.dailymotion.com/embed/video/x8hjb9k",
    genre: "South Indian",
    language: "Hindi",
    rating: "8.4",
    description: "Rocky, the most powerful criminal, pursues his ambition of becoming the king of Bombay. The story continues from Chapter 1 as Rocky strengthens his hold over the gold mining empire.",
  },
  {
    title: "RRR",
    poster: "https://m.media-amazon.com/images/M/MV5BODUwNDNjYzctODUxNy00ZTA2LWIyYTEtMDc5Y2E5ZjBmNTMzXkEyXkFqcGdeQXVyODE5NzE3OTE@._V1_SX300.jpg",
    backdrop_url: "https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=1920&q=80&auto=format&fit=crop",
    stream_url: "https://www.dailymotion.com/embed/video/x8k0o1f",
    genre: "South Indian",
    language: "Hindi",
    rating: "7.8",
    description: "A fictional story about two legendary revolutionaries and their journey away from home before they began the fight for their country in 1920s.",
  },
  {
    title: "Pathaan",
    poster: "https://m.media-amazon.com/images/M/MV5BYjFhZTY4NDQtNTgxNy00ZDk4LWI3ZGItNWIzNjY5MDg3MzBiXkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_SX300.jpg",
    backdrop_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80&auto=format&fit=crop",
    stream_url: "https://www.dailymotion.com/embed/video/x8kp6xo",
    genre: "Bollywood",
    language: "Hindi",
    rating: "5.8",
    description: "An Indian spy takes on the leader of a mercenary organization called 'Outfit X' which has a personal grudge against India. A high-octane action thriller starring Shah Rukh Khan.",
  },
  {
    title: "Brahmastra Part One: Shiva",
    poster: "https://m.media-amazon.com/images/M/MV5BODEzMDFiNzEtYzhhNy00MmQxLWE0MmItY2Q1NzYzN2FlMzg1XkEyXkFqcGdeQXVyMTE3NzA0Ng@@._V1_SX300.jpg",
    backdrop_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=80&auto=format&fit=crop",
    stream_url: "https://www.dailymotion.com/embed/video/x8kz6pd",
    genre: "Bollywood",
    language: "Hindi",
    rating: "5.6",
    description: "Shiva, a young man, discovers he has a mysterious connection with the Brahmastra — a supernatural weapon. He embarks on a journey to understand his powers and save the world.",
  },
  {
    title: "Pushpa: The Rise",
    poster: "https://m.media-amazon.com/images/M/MV5BYTJlZjI2NDQtYTc3OC00YTU4LTljOGQtYTc4MmJlOTNiODM4XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_SX300.jpg",
    backdrop_url: "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1920&q=80&auto=format&fit=crop",
    stream_url: "https://www.dailymotion.com/embed/video/x8c0t3t",
    genre: "South Indian",
    language: "Hindi",
    rating: "7.6",
    description: "Pushpa Raj, a coolie, rises through the ranks of a red sandalwood smuggling syndicate while evading the police. A gritty action drama starring Allu Arjun.",
  },
];

// Check if movies already exist
const existing = await client.query("SELECT COUNT(*) FROM movies");
console.log("Existing movies:", existing.rows[0].count);

if (parseInt(existing.rows[0].count) === 0) {
  for (const m of movies) {
    await client.query(
      `INSERT INTO movies (title, poster, backdrop_url, stream_url, genre, language, rating, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [m.title, m.poster, m.backdrop_url, m.stream_url, m.genre, m.language, m.rating, m.description]
    );
    console.log("Inserted:", m.title);
  }
  console.log("✓ 5 sample Indian movies seeded successfully!");
} else {
  console.log("Movies already exist, skipping seed.");
}

await client.end();
