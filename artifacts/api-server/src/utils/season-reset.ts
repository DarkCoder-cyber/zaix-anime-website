import { db, usersTable, settingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

/** Returns the ISO week number for a given date */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Returns the next Monday 00:00 UTC as a Date */
export function getNextResetDate(from: Date = new Date()): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMonday);
  return d;
}

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function getCurrentSeason(): Promise<number> {
  const val = await getSetting("currentSeason");
  return val ? parseInt(val) : 1;
}

export async function getSeasonInfo(): Promise<{
  currentSeason: number;
  lastResetAt: string | null;
  nextResetAt: string;
}> {
  const [currentSeason, lastResetAt] = await Promise.all([
    getSetting("currentSeason"),
    getSetting("lastWeeklyReset"),
  ]);
  return {
    currentSeason: currentSeason ? parseInt(currentSeason) : 1,
    lastResetAt,
    nextResetAt: getNextResetDate().toISOString(),
  };
}

export async function checkAndRunWeeklyReset(): Promise<boolean> {
  try {
    const lastResetStr = await getSetting("lastWeeklyReset");
    const now = new Date();

    if (lastResetStr) {
      const lastReset = new Date(lastResetStr);
      const lastWeek = getISOWeek(lastReset);
      const currentWeek = getISOWeek(now);
      const lastYear = lastReset.getUTCFullYear();
      const currentYear = now.getUTCFullYear();

      // No reset needed if same week and year
      if (currentYear === lastYear && currentWeek === lastWeek) return false;
    }

    // Run the reset
    const currentSeasonStr = await getSetting("currentSeason");
    const nextSeason = currentSeasonStr ? parseInt(currentSeasonStr) + 1 : 2;

    await Promise.all([
      db.update(usersTable).set({ weeklyXp: 0 }),
      setSetting("lastWeeklyReset", now.toISOString()),
      setSetting("currentSeason", String(nextSeason)),
    ]);

    logger.info({ season: nextSeason }, "Weekly XP reset completed — new season started");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to run weekly XP reset");
    return false;
  }
}

/** Call once on startup, then schedule hourly checks */
export function scheduleWeeklyReset(): void {
  checkAndRunWeeklyReset().catch(() => {});
  setInterval(() => checkAndRunWeeklyReset().catch(() => {}), 60 * 60 * 1000);
}
