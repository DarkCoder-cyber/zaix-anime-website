import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const moviesTable = pgTable("movies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  poster: text("poster"),
  backdropUrl: text("backdrop_url"),
  streamUrl: text("stream_url").notNull(),
  genre: text("genre").notNull().default("Bollywood"),
  language: text("language").notNull().default("Hindi"),
  rating: text("rating"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
