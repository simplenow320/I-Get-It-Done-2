import { db } from "./db";
import { users, tasks, userStats } from "@shared/schema";
import { eq, and, isNotNull, isNull, gte, lt, or, sql } from "drizzle-orm";
import { sendBulkPushNotifications } from "./pushNotifications";
import { getUsersWithWebPush, sendWebPushNotifications } from "./webPush";

// Unified fan-out: delivers each message via Expo push (if the user has a mobile
// token) and/or browser Web Push (if the user has browser subscriptions).
// Returns the number of users reached on at least one channel.
async function deliverNudges(
  messages: {
    userId: string;
    pushToken: string | null;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    categoryId?: string;
  }[]
): Promise<number> {
  if (messages.length === 0) return 0;

  const expoResult = await sendBulkPushNotifications(
    messages
      .filter((m) => m.pushToken)
      .map((m) => ({
        token: m.pushToken!,
        title: m.title,
        body: m.body,
        data: m.data,
        categoryId: m.categoryId,
      }))
  );

  const webSent = await sendWebPushNotifications(
    messages.map((m) => ({ userId: m.userId, title: m.title, body: m.body, data: m.data }))
  );

  return Math.max(expoResult.sent, 0) + webSent;
}

// ---- Intensity configuration ----
// Controls how often escalating nudges repeat for incomplete overdue tasks.
export type Intensity = "gentle" | "standard" | "relentless";

const NUDGE_INTERVAL_MS: Record<Intensity, number> = {
  gentle: 24 * 60 * 60 * 1000, // once a day
  standard: 4 * 60 * 60 * 1000, // every 4 hours
  relentless: 90 * 60 * 1000, // every 90 minutes
};

const MAX_NUDGES_PER_TASK: Record<Intensity, number> = {
  gentle: 5,
  standard: 12,
  relentless: 30,
};

const QUIET_HOUR_START = 21; // no nudges after 9pm local
const QUIET_HOUR_END = 8; // no nudges before 8am local

function normalizeIntensity(value: string | null | undefined): Intensity {
  if (value === "gentle" || value === "relentless") return value;
  return "standard";
}

// timezoneOffsetMinutes uses JS Date.getTimezoneOffset() semantics: UTC - local, in minutes.
function toLocal(now: Date, tzOffsetMinutes: number | null | undefined): Date {
  return new Date(now.getTime() - (tzOffsetMinutes || 0) * 60 * 1000);
}

function localDateStr(local: Date): string {
  return local.toISOString().split("T")[0];
}

function isQuietHours(local: Date): boolean {
  const h = local.getUTCHours();
  return h >= QUIET_HOUR_START || h < QUIET_HOUR_END;
}

// Escalating copy: tone gets firmer as nudgeCount climbs.
function escalatingMessage(taskTitle: string, nudgeCount: number): { title: string; body: string } {
  const t = taskTitle.length > 60 ? taskTitle.slice(0, 57) + "..." : taskTitle;
  if (nudgeCount === 0) {
    return { title: "Quick nudge", body: `"${t}" is still waiting. A small start counts — even 5 minutes.` };
  }
  if (nudgeCount === 1) {
    return { title: "Still on your plate", body: `"${t}" hasn't moved. Want to knock it out right now? Tap to start a focus timer.` };
  }
  if (nudgeCount === 2) {
    return { title: "Let's be real", body: `"${t}" keeps slipping. Open it and do just the first step — momentum will follow.` };
  }
  return { title: "It's not going away", body: `"${t}" — nudge #${nudgeCount + 1}. Future you will be so relieved. Start now?` };
}

// Prevent overlapping scheduler runs within this process.
let nudgeRunInProgress = false;
const SCAN_LIMIT = 1000;

// ---- Escalating reminders for overdue, incomplete tasks ----
export async function sendEscalatingNudges(): Promise<number> {
  if (nudgeRunInProgress) return 0;
  nudgeRunInProgress = true;
  try {
    return await runEscalatingNudges();
  } finally {
    nudgeRunInProgress = false;
  }
}

async function runEscalatingNudges(): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({
      taskId: tasks.id,
      title: tasks.title,
      nudgeCount: tasks.nudgeCount,
      lastNudgeAt: tasks.lastNudgeAt,
      userId: tasks.userId,
      pushToken: users.pushToken,
      intensity: users.notificationIntensity,
      tz: users.timezoneOffsetMinutes,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.userId, users.id))
    .where(
      and(
        // The app flags overdue tasks when it's open. A "now" task past its due
        // time is overdue even if the user hasn't opened the app since.
        or(eq(tasks.isOverdue, true), and(eq(tasks.lane, "now"), lt(tasks.dueDate, now))),
        isNull(tasks.completedAt),
        eq(users.notificationsEnabled, true),
        eq(users.escalatingRemindersEnabled, true)
      )
    )
    .limit(SCAN_LIMIT);

  const webUsers = await getUsersWithWebPush(
    Array.from(new Set(rows.map((r) => r.userId).filter((id): id is string => !!id)))
  );

  const toSend: { taskId: string; userId: string; token: string | null; title: string; body: string; nudgeCount: number }[] = [];
  const nudgedUsers = new Set<string>();

  // Intensity is a per-user pace, not per-task: a user with many overdue tasks
  // still gets at most one escalating nudge per interval.
  const lastNudgeByUser = new Map<string, number>();
  for (const row of rows) {
    if (!row.userId || !row.lastNudgeAt) continue;
    const t = row.lastNudgeAt.getTime();
    if (t > (lastNudgeByUser.get(row.userId) || 0)) lastNudgeByUser.set(row.userId, t);
  }

  for (const row of rows) {
    if (!row.userId) continue;
    // Skip users with no delivery channel at all.
    if (!row.pushToken && !webUsers.has(row.userId)) continue;
    const intensity = normalizeIntensity(row.intensity);
    const local = toLocal(now, row.tz);
    if (isQuietHours(local)) continue;

    const count = row.nudgeCount || 0;
    if (count >= MAX_NUDGES_PER_TASK[intensity]) continue;

    const last = row.lastNudgeAt ? row.lastNudgeAt.getTime() : 0;
    if (now.getTime() - last < NUDGE_INTERVAL_MS[intensity]) continue;

    if (now.getTime() - (lastNudgeByUser.get(row.userId) || 0) < NUDGE_INTERVAL_MS[intensity]) continue;

    // At most one escalating nudge per user per pass — avoid notification storms.
    if (nudgedUsers.has(row.userId)) continue;
    nudgedUsers.add(row.userId);

    // Atomically claim the nudge BEFORE sending: the eligibility predicate in the
    // UPDATE guarantees only one concurrent run can claim a given task.
    const cutoff = new Date(now.getTime() - NUDGE_INTERVAL_MS[intensity]);
    const claimed = await db
      .update(tasks)
      .set({ nudgeCount: count + 1, lastNudgeAt: now })
      .where(
        and(
          eq(tasks.id, row.taskId),
          isNull(tasks.completedAt),
          or(isNull(tasks.lastNudgeAt), lt(tasks.lastNudgeAt, cutoff))
        )
      )
      .returning({ id: tasks.id });
    if (claimed.length === 0) continue;

    const msg = escalatingMessage(row.title, count);
    toSend.push({ taskId: row.taskId, userId: row.userId, token: row.pushToken, title: msg.title, body: msg.body, nudgeCount: count });
  }

  if (toSend.length === 0) return 0;

  return deliverNudges(
    toSend.map((n) => ({
      userId: n.userId,
      pushToken: n.token,
      title: n.title,
      body: n.body,
      data: { type: "escalating_nudge", taskId: n.taskId },
      categoryId: "task_nudge",
    }))
  );
}

// ---- Morning kickoff & evening check-in ----
export async function sendDailyRhythmNotifications(): Promise<number> {
  const now = new Date();
  const candidates = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.notificationsEnabled, true),
        or(eq(users.morningKickoffEnabled, true), eq(users.eveningCheckinEnabled, true))
      )
    )
    .limit(SCAN_LIMIT);

  const webUsers = await getUsersWithWebPush(candidates.map((c) => c.id));

  let sent = 0;

  for (const u of candidates) {
    if (!u.pushToken && !webUsers.has(u.id)) continue;
    const local = toLocal(now, u.timezoneOffsetMinutes);
    const localHour = local.getUTCHours();
    const today = localDateStr(local);

    // Morning kickoff
    if (
      u.morningKickoffEnabled &&
      localHour === (u.morningKickoffHour ?? 8) &&
      u.lastMorningKickoffDate !== today
    ) {
      const open = await db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(and(eq(tasks.userId, u.id), isNull(tasks.completedAt)));

      if (open.length > 0) {
        const body =
          open.length === 1
            ? `One thing on your list: "${open[0].title}". Do it early, own the day.`
            : `${open.length} tasks are waiting. Don't scan the list — pick ONE and start. "${open[0].title}"?`;
        sent += await deliverNudges([
          {
            userId: u.id,
            pushToken: u.pushToken,
            title: "Good morning — what's your ONE thing?",
            body,
            data: { type: "morning_kickoff" },
          },
        ]);
      }
      await db.update(users).set({ lastMorningKickoffDate: today }).where(eq(users.id, u.id));
    }

    // Evening check-in
    if (
      u.eveningCheckinEnabled &&
      localHour === (u.eveningCheckinHour ?? 19) &&
      u.lastEveningCheckinDate !== today
    ) {
      const startOfLocalDayUtc = new Date(
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) +
          (u.timezoneOffsetMinutes || 0) * 60 * 1000
      );
      const open = await db
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .where(and(eq(tasks.userId, u.id), isNull(tasks.completedAt)));
      const doneToday = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, u.id), isNotNull(tasks.completedAt), gte(tasks.completedAt, startOfLocalDayUtc)));

      let title: string;
      let body: string;
      if (open.length === 0) {
        title = "Clean slate!";
        body = doneToday.length > 0 ? `${doneToday.length} done today and nothing left. That's a win.` : "Nothing pending. Enjoy your evening.";
      } else {
        title = "Evening check-in";
        body =
          doneToday.length > 0
            ? `${doneToday.length} done today — ${open.length} left. "${open[0].title}" is still doable tonight.`
            : `${open.length} still open. Even one small task tonight beats zero. Start with "${open[0].title}"?`;
      }

      if (open.length > 0 || doneToday.length > 0) {
        sent += await deliverNudges([
          { userId: u.id, pushToken: u.pushToken, title, body, data: { type: "evening_checkin" } },
        ]);
      }
      await db.update(users).set({ lastEveningCheckinDate: today }).where(eq(users.id, u.id));
    }
  }

  return sent;
}

// ---- Streak saver: urgent alert when a streak is about to die ----
const STREAK_SAVER_HOUR = 20; // 8pm local

export async function sendStreakSaverNotifications(): Promise<number> {
  const now = new Date();
  const rows = await db
    .select({
      userId: users.id,
      pushToken: users.pushToken,
      tz: users.timezoneOffsetMinutes,
      lastStreakSaverDate: users.lastStreakSaverDate,
      streakSaverEnabled: users.streakSaverEnabled,
      currentStreak: userStats.currentStreak,
      lastActiveDate: userStats.lastActiveDate,
    })
    .from(users)
    .innerJoin(userStats, eq(userStats.userId, users.id))
    .where(
      and(
        eq(users.notificationsEnabled, true),
        eq(users.streakSaverEnabled, true)
      )
    )
    .limit(SCAN_LIMIT);

  const webUsers = await getUsersWithWebPush(rows.map((r) => r.userId));

  let sent = 0;
  for (const u of rows) {
    if (!u.pushToken && !webUsers.has(u.userId)) continue;
    if (!u.currentStreak || u.currentStreak < 2) continue;
    const local = toLocal(now, u.tz);
    if (local.getUTCHours() !== STREAK_SAVER_HOUR) continue;
    const today = localDateStr(local);
    if (u.lastStreakSaverDate === today) continue;
    if (u.lastActiveDate === today) continue; // already safe
    // Only a streak that's still alive can be saved: the last active day must
    // be yesterday. Older streaks already ended.
    const yesterday = localDateStr(new Date(local.getTime() - 24 * 60 * 60 * 1000));
    if (u.lastActiveDate !== yesterday) continue;

    sent += await deliverNudges([
      {
        userId: u.userId,
        pushToken: u.pushToken,
        title: `Your ${u.currentStreak}-day streak dies at midnight`,
        body: "You're ONE task away from saving it. Pick the smallest thing on your list and go.",
        data: { type: "streak_saver", streak: u.currentStreak },
      },
    ]);
    await db.update(users).set({ lastStreakSaverDate: today }).where(eq(users.id, u.userId));
  }
  return sent;
}
