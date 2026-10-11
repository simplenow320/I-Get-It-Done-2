import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { db } from "./db";
import { users, tasks, userStats } from "@shared/schema";
import { eq, and, isNotNull, isNull, gt, lte, ne } from "drizzle-orm";
import { getUsersWithWebPush, sendWebPushNotifications, type WebPushMessage } from "./webPush";

const expo = new Expo();

interface PushResult {
  sent: number;
  failed: number;
  errors: string[];
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
    return false;
  }

  try {
    const messages: ExpoPushMessage[] = [
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {},
      },
    ];

    const tickets = await expo.sendPushNotificationsAsync(messages);
    const ticket = tickets[0];

    if ((ticket as any).status === "error") {
      console.error(`Push notification error:`, (ticket as any).message);
      if ((ticket as any).details?.error === "DeviceNotRegistered") {
        await clearInvalidToken(pushToken);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}

export async function sendBulkPushNotifications(
  notifications: { token: string; title: string; body: string; data?: Record<string, unknown>; categoryId?: string }[]
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, errors: [] };

  const messages: ExpoPushMessage[] = notifications
    .filter((n) => Expo.isExpoPushToken(n.token))
    .map((n) => ({
      to: n.token,
      sound: "default" as const,
      title: n.title,
      body: n.body,
      data: n.data || {},
      ...(n.categoryId ? { categoryId: n.categoryId } : {}),
    }));

  if (messages.length === 0) return result;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i] as any;
        if (ticket.status === "ok") {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push(ticket.message || "Unknown error");
          if (ticket.details?.error === "DeviceNotRegistered") {
            const msg = chunk[i] as any;
            await clearInvalidToken(msg.to);
          }
        }
      }
    } catch (error: any) {
      result.failed += chunk.length;
      result.errors.push(error.message || "Chunk send failed");
    }
  }

  return result;
}

async function clearInvalidToken(pushToken: string): Promise<void> {
  try {
    // Only this phone's token is dead. Leave notificationsEnabled alone so the
    // user's browser (Web Push) and future devices keep getting reminders.
    await db
      .update(users)
      .set({ pushToken: null })
      .where(eq(users.pushToken, pushToken));
    console.log(`Cleared invalid push token: ${pushToken}`);
  } catch (error) {
    console.error("Failed to clear invalid token:", error);
  }
}

export async function sendOverdueTaskNotifications(): Promise<PushResult> {
  try {
    const overdueResults = await db
      .select({
        userId: tasks.userId,
        taskTitle: tasks.title,
        taskId: tasks.id,
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled,
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.userId, users.id))
      .where(
        and(
          eq(tasks.isOverdue, true),
          isNull(tasks.completedAt),
          eq(users.notificationsEnabled, true)
        )
      );

    const webUsers = await getUsersWithWebPush(
      Array.from(new Set(overdueResults.map((r) => r.userId).filter((id): id is string => !!id)))
    );

    const userTaskMap = new Map<string, { token: string | null; tasks: { id: string; title: string }[] }>();

    for (const row of overdueResults) {
      if (!row.userId) continue;
      if (!row.pushToken && !webUsers.has(row.userId)) continue;
      if (!userTaskMap.has(row.userId)) {
        userTaskMap.set(row.userId, { token: row.pushToken, tasks: [] });
      }
      userTaskMap.get(row.userId)!.tasks.push({ id: row.taskId, title: row.taskTitle });
    }

    const expoNotifications: { token: string; title: string; body: string; data?: Record<string, unknown> }[] = [];
    const webMessages: WebPushMessage[] = [];

    for (const [userId, data] of Array.from(userTaskMap.entries())) {
      const count = data.tasks.length;
      const title = count === 1 ? "Task Needs Attention" : `${count} Tasks Need Attention`;
      const body =
        count === 1
          ? `"${data.tasks[0].title}" is overdue. Time to tackle it!`
          : `You have ${count} overdue tasks. "${data.tasks[0].title}" and ${count - 1} more.`;
      const payload = { type: "overdue", userId, taskId: data.tasks[0].id };

      if (data.token) {
        expoNotifications.push({ token: data.token, title, body, data: payload });
      }
      if (webUsers.has(userId)) {
        webMessages.push({ userId, title, body, data: payload });
      }
    }

    const result = await sendBulkPushNotifications(expoNotifications);
    result.sent += await sendWebPushNotifications(webMessages);
    return result;
  } catch (error) {
    console.error("Failed to send overdue notifications:", error);
    return { sent: 0, failed: 0, errors: [(error as Error).message] };
  }
}

export async function sendStreakReminderNotifications(): Promise<PushResult> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const streakUsers = await db
      .select({
        userId: userStats.userId,
        currentStreak: userStats.currentStreak,
        lastActiveDate: userStats.lastActiveDate,
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled,
      })
      .from(userStats)
      .innerJoin(users, eq(userStats.userId, users.id))
      .where(eq(users.notificationsEnabled, true));

    const eligible = streakUsers.filter((u): u is typeof u & { userId: string } => {
      if (!u.userId) return false;
      if (!u.currentStreak || u.currentStreak < 2) return false;
      if (u.lastActiveDate === today) return false;
      return true;
    });

    const webUsers = await getUsersWithWebPush(eligible.map((u) => u.userId));

    const expoNotifications: { token: string; title: string; body: string; data?: Record<string, unknown> }[] = [];
    const webMessages: WebPushMessage[] = [];

    for (const u of eligible) {
      const title = "Keep Your Streak Alive!";
      const body = `You're on a ${u.currentStreak}-day streak! Complete a task today to keep it going.`;
      const payload = { type: "streak", userId: u.userId, streak: u.currentStreak };

      if (u.pushToken) {
        expoNotifications.push({ token: u.pushToken, title, body, data: payload });
      }
      if (webUsers.has(u.userId)) {
        webMessages.push({ userId: u.userId, title, body, data: payload });
      }
    }

    const result = await sendBulkPushNotifications(expoNotifications);
    result.sent += await sendWebPushNotifications(webMessages);
    return result;
  } catch (error) {
    console.error("Failed to send streak notifications:", error);
    return { sent: 0, failed: 0, errors: [(error as Error).message] };
  }
}

// Each pass covers only tasks whose due time falls 90-120 minutes out. Passes
// run every 30 minutes, so every task is announced once instead of on each pass.
const DUE_SOON_WINDOW_START_MS = 90 * 60 * 1000;
const DUE_SOON_WINDOW_END_MS = 120 * 60 * 1000;
const DUE_SOON_QUIET_START = 21; // matches the nudge engine's quiet hours
const DUE_SOON_QUIET_END = 8;

export async function sendDueSoonNotifications(): Promise<PushResult> {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() + DUE_SOON_WINDOW_START_MS);
    const windowEnd = new Date(now.getTime() + DUE_SOON_WINDOW_END_MS);

    const dueSoonResults = await db
      .select({
        userId: tasks.userId,
        taskTitle: tasks.title,
        taskId: tasks.id,
        dueDate: tasks.dueDate,
        pushToken: users.pushToken,
        tz: users.timezoneOffsetMinutes,
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.userId, users.id))
      .where(
        and(
          isNull(tasks.completedAt),
          isNotNull(tasks.dueDate),
          gt(tasks.dueDate, windowStart),
          lte(tasks.dueDate, windowEnd),
          eq(users.notificationsEnabled, true),
          eq(tasks.isOverdue, false),
          ne(tasks.lane, "park")
        )
      );

    // One notification per user per pass, outside their quiet hours.
    const byUser = new Map<string, { token: string | null; tasks: { id: string; title: string }[] }>();
    for (const r of dueSoonResults) {
      if (!r.userId) continue;
      const localHour = new Date(now.getTime() - (r.tz || 0) * 60 * 1000).getUTCHours();
      if (localHour >= DUE_SOON_QUIET_START || localHour < DUE_SOON_QUIET_END) continue;
      if (!byUser.has(r.userId)) byUser.set(r.userId, { token: r.pushToken, tasks: [] });
      byUser.get(r.userId)!.tasks.push({ id: r.taskId, title: r.taskTitle });
    }

    const webUsers = await getUsersWithWebPush(Array.from(byUser.keys()));

    const expoNotifications: { token: string; title: string; body: string; data?: Record<string, unknown> }[] = [];
    const webMessages: WebPushMessage[] = [];

    for (const [userId, entry] of Array.from(byUser.entries())) {
      const count = entry.tasks.length;
      const title = count === 1 ? "Task Due Soon" : `${count} Tasks Due Soon`;
      const body =
        count === 1
          ? `"${entry.tasks[0].title}" is due in less than 2 hours.`
          : `"${entry.tasks[0].title}" and ${count - 1} more are due in less than 2 hours.`;
      const payload = { type: "due_soon", taskId: entry.tasks[0].id, userId };

      if (entry.token) {
        expoNotifications.push({ token: entry.token, title, body, data: payload });
      }
      if (webUsers.has(userId)) {
        webMessages.push({ userId, title, body, data: payload });
      }
    }

    const result = await sendBulkPushNotifications(expoNotifications);
    result.sent += await sendWebPushNotifications(webMessages);
    return result;
  } catch (error) {
    console.error("Failed to send due-soon notifications:", error);
    return { sent: 0, failed: 0, errors: [(error as Error).message] };
  }
}

// Sends one notification to every channel a user has (phone + browsers),
// respecting their master notifications switch.
async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const [user] = await db
    .select({ pushToken: users.pushToken, notificationsEnabled: users.notificationsEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.notificationsEnabled) return false;

  let delivered = false;
  if (user.pushToken) {
    delivered = await sendPushNotification(user.pushToken, title, body, data);
  }
  const webSent = await sendWebPushNotifications([{ userId, title, body, data }]);
  return delivered || webSent > 0;
}

export async function sendDelegationNotification(
  delegatedToUserId: string,
  taskTitle: string,
  delegatorName: string,
  taskId?: string
): Promise<boolean> {
  try {
    return await notifyUser(
      delegatedToUserId,
      "New Task Assigned",
      `${delegatorName} assigned you: "${taskTitle}"`,
      { type: "delegation", taskTitle, ...(taskId ? { taskId } : {}) }
    );
  } catch (error) {
    console.error("Failed to send delegation notification:", error);
    return false;
  }
}

// Tells a task's owner that the teammate they handed it to moved it along.
export async function sendDelegationStatusNotification(
  ownerId: string,
  taskId: string,
  taskTitle: string,
  delegateName: string,
  statusLabel: string,
  note?: string
): Promise<boolean> {
  try {
    const t = taskTitle.length > 60 ? taskTitle.slice(0, 57) + "..." : taskTitle;
    const body = note
      ? `${delegateName} set "${t}" to ${statusLabel}: ${note.length > 80 ? note.slice(0, 77) + "..." : note}`
      : `${delegateName} set "${t}" to ${statusLabel}.`;
    return await notifyUser(ownerId, statusLabel === "Done" ? "Hand-off complete" : "Hand-off update", body, {
      type: "delegation_update",
      taskId,
    });
  } catch (error) {
    console.error("Failed to send delegation status notification:", error);
    return false;
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastDueSoonCheck = 0;
let lastNudgeCheck = 0;

const DUE_SOON_INTERVAL = 30 * 60 * 1000;
const NUDGE_INTERVAL = 10 * 60 * 1000;

export function startNotificationScheduler(): void {
  if (schedulerInterval) return;

  console.log("[Notifications] Scheduler started");

  schedulerInterval = setInterval(async () => {
    const now = Date.now();

    if (now - lastDueSoonCheck >= DUE_SOON_INTERVAL) {
      lastDueSoonCheck = now;
      const result = await sendDueSoonNotifications();
      if (result.sent > 0) {
        console.log(`[Notifications] Due-soon: ${result.sent} sent, ${result.failed} failed`);
      }
    }

    if (now - lastNudgeCheck >= NUDGE_INTERVAL) {
      lastNudgeCheck = now;
      try {
        const { sendEscalatingNudges, sendDailyRhythmNotifications, sendStreakSaverNotifications } =
          await import("./nudgeEngine");
        const [nudges, rhythm, streaks] = [
          await sendEscalatingNudges(),
          await sendDailyRhythmNotifications(),
          await sendStreakSaverNotifications(),
        ];
        if (nudges + rhythm + streaks > 0) {
          console.log(
            `[Notifications] Nudges: ${nudges} escalating, ${rhythm} daily-rhythm, ${streaks} streak-saver`
          );
        }
      } catch (e) {
        console.error("[Notifications] Nudge engine error:", e);
      }
    }
  }, 60 * 1000);
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Notifications] Scheduler stopped");
  }
}
