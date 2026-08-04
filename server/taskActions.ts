import { db } from "./db";
import { userStats } from "@shared/schema";
import { eq } from "drizzle-orm";

// Shared streak/points/level update applied when a task transitions to completed.
// Used by both the REST task-update route and the MCP complete_task tool so
// completions from AI chats count exactly like in-app completions.
export async function applyCompletionStats(userId: string): Promise<void> {
  const existingStats = await db.select().from(userStats).where(eq(userStats.userId, userId));
  const today = new Date().toISOString().split("T")[0];

  if (existingStats.length > 0) {
    const stats = existingStats[0];
    const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate).toISOString().split("T")[0] : null;

    let newStreak = stats.currentStreak || 0;
    if (lastActive !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastActive === yesterdayStr ? (stats.currentStreak || 0) + 1 : 1;
    }

    const newPoints = (stats.points || 0) + 10;
    const newTotalCompleted = (stats.totalTasksCompleted || 0) + 1;
    const newLongestStreak = Math.max(stats.longestStreak || 0, newStreak);

    let newLevel = "starter";
    if (newPoints >= 1000) newLevel = "master";
    else if (newPoints >= 500) newLevel = "expert";
    else if (newPoints >= 200) newLevel = "focused";
    else if (newPoints >= 100) newLevel = "achiever";

    await db.update(userStats).set({
      points: newPoints,
      totalTasksCompleted: newTotalCompleted,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      level: newLevel,
      lastActiveDate: today,
    }).where(eq(userStats.userId, userId));
  } else {
    await db.insert(userStats).values({
      userId,
      points: 10,
      totalTasksCompleted: 1,
      currentStreak: 1,
      longestStreak: 1,
      level: "starter",
      lastActiveDate: today,
    });
  }
}
