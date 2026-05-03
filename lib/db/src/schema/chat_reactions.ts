import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { chatMessagesTable } from "./chat";

export const chatReactionsTable = pgTable("chat_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => chatMessagesTable.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.messageId, t.userName, t.emoji),
}));

export type ChatReaction = typeof chatReactionsTable.$inferSelect;
