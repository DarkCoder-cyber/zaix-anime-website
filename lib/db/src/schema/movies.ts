import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const moviesTable = pgTable("movies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  poster: text("poster"),
  backdropUrl: text("backdrop_url"),
  streamUrl: text("stream_url").notNull().default("tmdb"),
  tmdbId: integer("tmdb_id"),
  genre: text("genre").notNull().default("Bollywood"),
  language: text("language").notNull().default("Hindi"),
  rating: text("rating"),
  description: text("description"),
  year: text("year"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
