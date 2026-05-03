import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const watchProgressTable = pgTable("watch_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  episode: integer("episode").notNull().default(1),
  progressSeconds: integer("progress_seconds").notNull().default(0),
  totalSeconds: integer("total_seconds").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WatchProgress = typeof watchProgressTable.$inferSelect;
