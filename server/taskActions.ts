import { db } from "./db";
import { userStats, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

// timezoneOffsetMinutes uses JS Date.getTimezoneOffset() semantics: UTC - local.
export function localDateString(tzOffsetMinutes: number | null | undefined, at: Date = new Date()): string {
  return new Date(at.getTime() - (tzOffsetMinutes || 0) * 60 * 1000).toISOString().split("T")[0];
}

// Default due date for a lane when none is given, matching the app's lane timings.
export function defaultDueDate(lane: string, tzOffsetMinutes: number | null | undefined): Date {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (lane) {
    case "soon":
      return new Date(now + 3 * day);
    case "later":
      return new Date(now + 7 * day);
    case "park":
      return new Date(now + 30 * day);
    default: {
      // End of the user's local day.
      const offsetMs = (tzOffsetMinutes || 0) * 60 * 1000;
      const local = new Date(now - offsetMs);
      const endOfLocalDay = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 23, 59, 59, 999);
      return new Date(endOfLocalDay + offsetMs);
    }
  }
}

// Shared streak/points/level update applied when a task transitions to completed.
// Used by both the REST task-update route and the MCP complete_task tool so
// completions from AI chats count exactly like in-app completions.
//
// Runs as a single upsert so two completions landing at once both count, and
// dates are the user's local calendar day so streaks roll over at their midnight.
export async function applyCompletionStats(userId: string): Promise<void> {
  const [user] = await db
    .select({ tz: users.timezoneOffsetMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const now = new Date();
  const today = localDateString(user?.tz, now);
  const yesterday = localDateString(user?.tz, new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const newPoints = sql`COALESCE(${userStats.points}, 0) + 10`;
  const newStreak = sql`CASE
    WHEN ${userStats.lastActiveDate} = ${today}::date THEN GREATEST(COALESCE(${userStats.currentStreak}, 0), 1)
    WHEN ${userStats.lastActiveDate} = ${yesterday}::date THEN COALESCE(${userStats.currentStreak}, 0) + 1
    ELSE 1
  END`;

  await db
    .insert(userStats)
    .values({
      userId,
      points: 10,
      totalTasksCompleted: 1,
      currentStreak: 1,
      longestStreak: 1,
      level: "starter",
      lastActiveDate: today,
    })
    .onConflictDoUpdate({
      target: userStats.userId,
      set: {
        points: newPoints,
        totalTasksCompleted: sql`COALESCE(${userStats.totalTasksCompleted}, 0) + 1`,
        currentStreak: newStreak,
        longestStreak: sql`GREATEST(COALESCE(${userStats.longestStreak}, 0), ${newStreak})`,
        level: sql`CASE
          WHEN ${newPoints} >= 1000 THEN 'master'
          WHEN ${newPoints} >= 500 THEN 'expert'
          WHEN ${newPoints} >= 200 THEN 'focused'
          WHEN ${newPoints} >= 100 THEN 'achiever'
          ELSE 'starter'
        END`,
        lastActiveDate: today,
      },
    });
}
