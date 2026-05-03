import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const customStreamsTable = pgTable("custom_streams", {
  id: serial("id").primaryKey(),
  malId: integer("mal_id").notNull(),
  animeTitle: text("anime_title").notNull(),
  episode: integer("episode").notNull(),
  streamUrl: text("stream_url").notNull(),
  language: text("language").notNull().default("hindi"),
  quality: text("quality").notNull().default("HD"),
  providerLabel: text("provider_label").notNull().default("Custom"),
  addedBy: text("added_by").notNull().default("admin"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
