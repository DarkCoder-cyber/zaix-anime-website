import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  contentTitle: text("content_title").notNull(),
  contentImage: text("content_image"),
  contentGenres: text("content_genres"),
  status: text("status").notNull().default("watching"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WatchlistItem = typeof watchlistTable.$inferSelect;
