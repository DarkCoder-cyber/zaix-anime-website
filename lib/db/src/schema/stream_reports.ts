import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const streamReportsTable = pgTable("stream_reports", {
  id: serial("id").primaryKey(),
  malId: integer("mal_id").notNull(),
  animeTitle: text("anime_title").notNull().default("Unknown"),
  episode: integer("episode").notNull(),
  provider: text("provider").notNull(),
  providerLabel: text("provider_label").notNull(),
  reportedBy: text("reported_by").notNull().default("Anonymous"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StreamReport = typeof streamReportsTable.$inferSelect;
