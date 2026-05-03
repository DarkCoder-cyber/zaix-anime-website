import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const globalAlertsTable = pgTable("global_alerts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GlobalAlert = typeof globalAlertsTable.$inferSelect;
