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
  type: "overdue" | "reminder" | "achievement" | "streak";
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

export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    await apiRequest("PUT", `/api/users/${userId}/push-token`, { pushToken: token });
  } catch (error) {
    console.error("Failed to save push token:", error);
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
