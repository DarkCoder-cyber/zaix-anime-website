import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const reviewRepliesTable = pgTable("review_replies", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  userName: text("user_name").notNull().default("Anonymous"),
  replyText: text("reply_text").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReviewReply = typeof reviewRepliesTable.$inferSelect;
