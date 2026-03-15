import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiUrl, apiRequest } from "./query-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData extends Record<string, unknown> {
  taskId?: string;
  type: "overdue" | "reminder" | "achievement" | "streak" | "pro_nudge";
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") {
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    
    return token.data;
  } catch (error) {
    console.log("Failed to get push token:", error);
    return null;
  }
}

export async function savePushToken(userId: string, token: string, enableNotifications?: boolean): Promise<void> {
  try {
    const body: Record<string, any> = { pushToken: token };
    if (enableNotifications !== undefined) {
      body.notificationsEnabled = enableNotifications;
    }
    await apiRequest("PUT", `/api/users/${userId}/push-token`, body);
  } catch (error) {
    console.error("Failed to save push token:", error);
  }
}

export async function registerPushTokenIfNeeded(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const token = await getExpoPushToken();
    if (token) {
      await savePushToken(userId, token);
    }
  } catch (error) {
    console.log("Push token registration skipped:", error);
  }
}

export async function scheduleOverdueNotification(taskTitle: string, taskId: string): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Needs Attention",
        body: `"${taskTitle}" is overdue. Time to tackle it!`,
        data: { taskId, type: "overdue" } as NotificationData,
        sound: true,
      },
      trigger: null,
    });
    return identifier;
  } catch (error) {
    console.error("Failed to schedule overdue notification:", error);
    return null;
  }
}

export async function scheduleReminderNotification(
  taskTitle: string,
  taskId: string,
  minutesBefore: number = 30
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Upcoming Task",
        body: `"${taskTitle}" is coming up soon. Ready to start?`,
        data: { taskId, type: "reminder" } as NotificationData,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutesBefore * 60,
      },
    });
    return identifier;
  } catch (error) {
    console.error("Failed to schedule reminder notification:", error);
    return null;
  }
}

export async function scheduleAchievementNotification(
  achievementName: string,
  achievementDescription: string
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Achievement Unlocked!",
        body: `${achievementName}: ${achievementDescription}`,
        data: { type: "achievement" } as NotificationData,
        sound: true,
      },
      trigger: null,
    });
    return identifier;
  } catch (error) {
    console.error("Failed to schedule achievement notification:", error);
    return null;
  }
}

export async function scheduleStreakNotification(streakDays: number): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Keep Your Streak!",
        body: `You're on a ${streakDays}-day streak! Complete a task today to keep it going.`,
        data: { type: "streak" } as NotificationData,
        sound: true,
      },
      trigger: null,
    });
    return identifier;
  } catch (error) {
    console.error("Failed to schedule streak notification:", error);
    return null;
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  if (Platform.OS === "web") return;
  
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.error("Failed to cancel notification:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Failed to cancel all notifications:", error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

const PRO_NUDGE_MESSAGES = [
  { title: "Your potential is showing", body: "Voice capture turns scattered thoughts into organized tasks. Unlock it with Pro." },
  { title: "Focus is a superpower", body: "Pro's Focus Mode helps you zero in on what matters most. Ready to try it?" },
  { title: "Small wins, big momentum", body: "Track your streaks and celebrate progress with Pro's gamification features." },
  { title: "You're doing great", body: "Imagine doing even more with voice capture, focus timers, and team delegation." },
  { title: "One less thing to think about", body: "Let your voice do the typing. Pro makes task capture effortless." },
  { title: "Built for brains like yours", body: "Focus Mode, streaks, and weekly insights -- designed to help you thrive." },
  { title: "Say it. Done.", body: "Voice-to-task AI turns your words into organized action items instantly." },
  { title: "Keep the momentum going", body: "Unlock streaks, XP, and achievements to make productivity feel rewarding." },
];

const PRO_NUDGE_IDENTIFIER_PREFIX = "pro_nudge_";

export async function scheduleProNudgeNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existingNudges = scheduled.filter(n => 
      (n.content.data as NotificationData)?.type === "pro_nudge"
    );
    
    if (existingNudges.length >= 2) return;

    for (const nudge of existingNudges) {
      await Notifications.cancelScheduledNotificationAsync(nudge.identifier);
    }

    const shuffled = [...PRO_NUDGE_MESSAGES].sort(() => Math.random() - 0.5);

    await Notifications.scheduleNotificationAsync({
      identifier: PRO_NUDGE_IDENTIFIER_PREFIX + "1",
      content: {
        title: shuffled[0].title,
        body: shuffled[0].body,
        data: { type: "pro_nudge" } as NotificationData,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 15 * 24 * 60 * 60,
      },
    });

    await Notifications.scheduleNotificationAsync({
      identifier: PRO_NUDGE_IDENTIFIER_PREFIX + "2",
      content: {
        title: shuffled[1].title,
        body: shuffled[1].body,
        data: { type: "pro_nudge" } as NotificationData,
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.log("Failed to schedule pro nudge notifications:", error);
  }
}

export async function cancelProNudgeNotifications(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const nudges = scheduled.filter(n => 
      (n.content.data as NotificationData)?.type === "pro_nudge"
    );
    for (const nudge of nudges) {
      await Notifications.cancelScheduledNotificationAsync(nudge.identifier);
    }
  } catch (error) {
    console.log("Failed to cancel pro nudge notifications:", error);
  }
}
