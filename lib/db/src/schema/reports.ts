import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  contentType: text("content_type").notNull(),
  contentId: text("content_id").notNull(),
  reportedUser: text("reported_user").notNull(),
  reviewText: text("review_text"),
  reason: text("reason").notNull().default("inappropriate"),
  reportedBy: text("reported_by").notNull().default("Anonymous"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
