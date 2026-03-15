import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { db } from "./db";
import { users, tasks, userStats } from "@shared/schema";
import { eq, and, isNotNull, lt, isNull } from "drizzle-orm";

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
  notifications: { token: string; title: string; body: string; data?: Record<string, unknown> }[]
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
          isNotNull(users.pushToken),
          eq(users.notificationsEnabled, true)
        )
      );

    const userTaskMap = new Map<string, { token: string; tasks: { id: string; title: string }[] }>();

    for (const row of overdueResults) {
      if (!row.pushToken || !row.userId) continue;
      if (!userTaskMap.has(row.userId)) {
        userTaskMap.set(row.userId, { token: row.pushToken, tasks: [] });
      }
      userTaskMap.get(row.userId)!.tasks.push({ id: row.taskId, title: row.taskTitle });
    }

    const notifications = Array.from(userTaskMap.entries()).map(([userId, data]) => {
      const count = data.tasks.length;
      const title = count === 1 ? "Task Needs Attention" : `${count} Tasks Need Attention`;
      const body =
        count === 1
          ? `"${data.tasks[0].title}" is overdue. Time to tackle it!`
          : `You have ${count} overdue tasks. "${data.tasks[0].title}" and ${count - 1} more.`;

      return {
        token: data.token,
        title,
        body,
        data: { type: "overdue", userId, taskId: data.tasks[0].id },
      };
    });

    return sendBulkPushNotifications(notifications);
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
      .where(
        and(
          isNotNull(users.pushToken),
          eq(users.notificationsEnabled, true)
        )
      );

    const notifications = streakUsers
      .filter((u) => {
        if (!u.pushToken || !u.currentStreak || u.currentStreak < 2) return false;
        if (u.lastActiveDate === today) return false;
        return true;
      })
      .map((u) => ({
        token: u.pushToken!,
        title: "Keep Your Streak Alive!",
        body: `You're on a ${u.currentStreak}-day streak! Complete a task today to keep it going.`,
        data: { type: "streak", userId: u.userId, streak: u.currentStreak },
      }));

    return sendBulkPushNotifications(notifications);
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
          isNotNull(users.pushToken),
          eq(users.notificationsEnabled, true),
          eq(tasks.isOverdue, false)
        )
      );

    const notifications = dueSoonResults
      .filter((r) => r.pushToken && r.dueDate && r.dueDate > now)
      .map((r) => ({
        token: r.pushToken!,
        title: "Task Due Soon",
        body: `"${r.taskTitle}" is due in less than 2 hours.`,
        data: { type: "due_soon", taskId: r.taskId, userId: r.userId },
      }));

    return sendBulkPushNotifications(notifications);
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

    if (!user?.pushToken || !user.notificationsEnabled) return false;

    return sendPushNotification(
      user.pushToken,
      "New Task Assigned",
      `${delegatorName} assigned you: "${taskTitle}"`,
      { type: "delegation", taskTitle }
    );
  } catch (error) {
    console.error("Failed to send delegation notification:", error);
    return false;
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastOverdueCheck = 0;
let lastStreakCheck = 0;
let lastDueSoonCheck = 0;

const OVERDUE_INTERVAL = 4 * 60 * 60 * 1000;
const STREAK_INTERVAL = 8 * 60 * 60 * 1000;
const DUE_SOON_INTERVAL = 30 * 60 * 1000;

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

    if (now - lastOverdueCheck >= OVERDUE_INTERVAL) {
      lastOverdueCheck = now;
      const result = await sendOverdueTaskNotifications();
      if (result.sent > 0) {
        console.log(`[Notifications] Overdue: ${result.sent} sent, ${result.failed} failed`);
      }
    }

    if (now - lastStreakCheck >= STREAK_INTERVAL) {
      lastStreakCheck = now;
      const result = await sendStreakReminderNotifications();
      if (result.sent > 0) {
        console.log(`[Notifications] Streak: ${result.sent} sent, ${result.failed} failed`);
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
