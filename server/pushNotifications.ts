import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { db } from "./db";
import { users, tasks, userStats } from "@shared/schema";
import { eq, and, isNotNull, lt, isNull } from "drizzle-orm";
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
    await db
      .update(users)
      .set({ pushToken: null, notificationsEnabled: false })
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

export async function sendDueSoonNotifications(): Promise<PushResult> {
  try {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const dueSoonResults = await db
      .select({
        userId: tasks.userId,
        taskTitle: tasks.title,
        taskId: tasks.id,
        dueDate: tasks.dueDate,
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled,
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.userId, users.id))
      .where(
        and(
          isNull(tasks.completedAt),
          isNotNull(tasks.dueDate),
          lt(tasks.dueDate, twoHoursFromNow),
          eq(users.notificationsEnabled, true),
          eq(tasks.isOverdue, false)
        )
      );

    const eligible = dueSoonResults.filter(
      (r): r is typeof r & { userId: string } => !!r.userId && !!r.dueDate && r.dueDate > now
    );

    const webUsers = await getUsersWithWebPush(
      Array.from(new Set(eligible.map((r) => r.userId)))
    );

    const expoNotifications: { token: string; title: string; body: string; data?: Record<string, unknown> }[] = [];
    const webMessages: WebPushMessage[] = [];

    for (const r of eligible) {
      const title = "Task Due Soon";
      const body = `"${r.taskTitle}" is due in less than 2 hours.`;
      const payload = { type: "due_soon", taskId: r.taskId, userId: r.userId };

      if (r.pushToken) {
        expoNotifications.push({ token: r.pushToken, title, body, data: payload });
      }
      if (webUsers.has(r.userId)) {
        webMessages.push({ userId: r.userId, title, body, data: payload });
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

export async function sendDelegationNotification(
  delegatedToUserId: string,
  taskTitle: string,
  delegatorName: string
): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, delegatedToUserId))
      .limit(1);

    if (!user || !user.notificationsEnabled) return false;

    const title = "New Task Assigned";
    const body = `${delegatorName} assigned you: "${taskTitle}"`;
    const payload = { type: "delegation", taskTitle };

    let delivered = false;

    if (user.pushToken) {
      delivered = await sendPushNotification(user.pushToken, title, body, payload);
    }

    const webSent = await sendWebPushNotifications([
      { userId: delegatedToUserId, title, body, data: payload },
    ]);

    return delivered || webSent > 0;
  } catch (error) {
    console.error("Failed to send delegation notification:", error);
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
