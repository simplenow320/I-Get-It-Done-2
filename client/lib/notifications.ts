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
  type:
    | "overdue"
    | "reminder"
    | "achievement"
    | "streak"
    | "pro_nudge"
    | "escalating_nudge"
    | "morning_kickoff"
    | "evening_checkin"
    | "streak_saver";
}

export const TASK_NUDGE_CATEGORY = "task_nudge";
export const ACTION_MARK_DONE = "mark_done";
export const ACTION_START_FOCUS = "start_focus";
export const ACTION_SNOOZE = "snooze_1h";

export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Notifications.setNotificationCategoryAsync(TASK_NUDGE_CATEGORY, [
      {
        identifier: ACTION_MARK_DONE,
        buttonTitle: "\u2713 Mark done",
        // Foreground-open so the JS response listener reliably runs the API call
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_START_FOCUS,
        buttonTitle: "Start focus timer",
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_SNOOZE,
        buttonTitle: "Snooze 1h",
        // Foreground-open so the JS response listener reliably runs the API call
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (error) {
    console.log("Failed to set notification categories:", error);
  }
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
    const body: Record<string, any> = {
      pushToken: token,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    };
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

// ---- Web push (browser notifications) ----

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function isWebPushSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getWebPushSubscription(): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// Asks for browser permission, registers the service worker, subscribes with the
// server's VAPID key, and saves the subscription. Returns true on success.
export async function enableWebPush(userId: string): Promise<boolean> {
  if (!isWebPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const keyResponse = await fetch(new URL("/api/web-push/vapid-public-key", getApiUrl()).toString());
    if (!keyResponse.ok) throw new Error("Failed to fetch VAPID public key");
    const { publicKey } = await keyResponse.json();

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    await apiRequest("POST", `/api/users/${userId}/web-push-subscriptions`, {
      subscription: subscription.toJSON(),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    });

    return true;
  } catch (error) {
    console.error("Failed to enable web push:", error);
    return false;
  }
}

export async function disableWebPush(userId: string): Promise<void> {
  try {
    const subscription = await getWebPushSubscription();
    if (subscription) {
      await apiRequest("DELETE", `/api/users/${userId}/web-push-subscriptions`, {
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.error("Failed to disable web push:", error);
  }
}

// Re-syncs an existing browser subscription with the server on app start.
export async function registerWebPushIfNeeded(userId: string): Promise<void> {
  if (!isWebPushSupported()) return;
  try {
    if (Notification.permission !== "granted") return;
    const subscription = await getWebPushSubscription();
    if (!subscription) return;
    await apiRequest("POST", `/api/users/${userId}/web-push-subscriptions`, {
      subscription: subscription.toJSON(),
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    });
  } catch (error) {
    console.log("Web push re-registration skipped:", error);
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
