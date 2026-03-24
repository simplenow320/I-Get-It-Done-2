import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Switch, Pressable, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { requestNotificationPermissions } from "@/lib/notifications";

const STORAGE_KEY_PREFIX = "@daily_reminders_";
const MORNING_ID = "daily_reminder_morning";
const EVENING_ID = "daily_reminder_evening";

interface ReminderState {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
}

const DEFAULT_STATE: ReminderState = {
  morningEnabled: false,
  morningHour: 8,
  morningMinute: 0,
  eveningEnabled: false,
  eveningHour: 20,
  eveningMinute: 0,
};

const MORNING_MESSAGES = [
  { title: "New day, fresh start", body: "Brain dump what's on your mind and own today." },
  { title: "What matters today?", body: "Capture your priorities. One quick dump is all it takes." },
  { title: "Your lanes are waiting", body: "Open up and plan your day in seconds." },
];

const EVENING_MESSAGES = [
  { title: "How'd today go?", body: "Review what you finished and set up tomorrow." },
  { title: "Time to wrap up", body: "Check off what's done and park the rest." },
  { title: "End of day check-in", body: "See your progress and plan ahead." },
];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

async function scheduleDailyReminder(
  identifier: string,
  hour: number,
  minute: number,
  messages: typeof MORNING_MESSAGES
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {}

  const msg = messages[Math.floor(Math.random() * messages.length)];

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: msg.title,
        body: msg.body,
        data: { type: "daily_reminder" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.log("Failed to schedule daily reminder:", error);
  }
}

async function cancelDailyReminder(identifier: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {}
}

interface DailyReminderSettingsProps {
  userId?: string;
}

export function DailyReminderSettings({ userId }: DailyReminderSettingsProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<ReminderState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const isWeb = Platform.OS === "web";
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!storageKey) {
      setLoaded(true);
      return;
    }
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) {
        try {
          setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });
  }, [storageKey]);

  const persist = useCallback(async (next: ReminderState) => {
    setState(next);
    if (storageKey) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    }
  }, [storageKey]);

  const handleMorningToggle = async () => {
    if (isWeb) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!state.morningEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      await scheduleDailyReminder(MORNING_ID, state.morningHour, state.morningMinute, MORNING_MESSAGES);
      persist({ ...state, morningEnabled: true });
    } else {
      await cancelDailyReminder(MORNING_ID);
      persist({ ...state, morningEnabled: false });
    }
  };

  const handleEveningToggle = async () => {
    if (isWeb) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!state.eveningEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      await scheduleDailyReminder(EVENING_ID, state.eveningHour, state.eveningMinute, EVENING_MESSAGES);
      persist({ ...state, eveningEnabled: true });
    } else {
      await cancelDailyReminder(EVENING_ID);
      persist({ ...state, eveningEnabled: false });
    }
  };

  const cycleTime = async (
    type: "morning" | "evening",
    direction: "up" | "down"
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hourKey = type === "morning" ? "morningHour" : "eveningHour";
    const enabledKey = type === "morning" ? "morningEnabled" : "eveningEnabled";
    const identifier = type === "morning" ? MORNING_ID : EVENING_ID;
    const messages = type === "morning" ? MORNING_MESSAGES : EVENING_MESSAGES;

    let newHour = state[hourKey] + (direction === "up" ? 1 : -1);
    if (newHour > 23) newHour = 0;
    if (newHour < 0) newHour = 23;

    const next = { ...state, [hourKey]: newHour };
    await persist(next);

    if (next[enabledKey]) {
      await scheduleDailyReminder(identifier, newHour, next[type === "morning" ? "morningMinute" : "eveningMinute"], messages);
    }
  };

  if (!loaded) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.sectionHeader}>
        <Feather name="clock" size={18} color={LaneColors.soon.primary} />
        <ThemedText style={styles.sectionTitle}>Daily Reminders</ThemedText>
      </View>

      <View style={styles.reminderRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.label}>Morning check-in</ThemedText>
          {state.morningEnabled ? (
            <View style={styles.timeRow}>
              <Pressable onPress={() => cycleTime("morning", "down")} hitSlop={8}>
                <Feather name="minus" size={14} color={theme.textSecondary} />
              </Pressable>
              <ThemedText type="caption" style={{ color: LaneColors.soon.primary, marginHorizontal: Spacing.xs }}>
                {formatTime(state.morningHour, state.morningMinute)}
              </ThemedText>
              <Pressable onPress={() => cycleTime("morning", "up")} hitSlop={8}>
                <Feather name="plus" size={14} color={theme.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {isWeb ? "Run in Expo Go to enable" : "Off"}
            </ThemedText>
          )}
        </View>
        <Switch
          value={state.morningEnabled}
          onValueChange={handleMorningToggle}
          disabled={isWeb}
          trackColor={{ false: theme.border, true: LaneColors.soon.primary }}
          thumbColor={state.morningEnabled ? "#FFFFFF" : theme.textSecondary}
        />
      </View>

      <View style={[styles.reminderRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.label}>Evening review</ThemedText>
          {state.eveningEnabled ? (
            <View style={styles.timeRow}>
              <Pressable onPress={() => cycleTime("evening", "down")} hitSlop={8}>
                <Feather name="minus" size={14} color={theme.textSecondary} />
              </Pressable>
              <ThemedText type="caption" style={{ color: LaneColors.soon.primary, marginHorizontal: Spacing.xs }}>
                {formatTime(state.eveningHour, state.eveningMinute)}
              </ThemedText>
              <Pressable onPress={() => cycleTime("evening", "up")} hitSlop={8}>
                <Feather name="plus" size={14} color={theme.textSecondary} />
              </Pressable>
            </View>
          ) : (
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {isWeb ? "Run in Expo Go to enable" : "Off"}
            </ThemedText>
          )}
        </View>
        <Switch
          value={state.eveningEnabled}
          onValueChange={handleEveningToggle}
          disabled={isWeb}
          trackColor={{ false: theme.border, true: LaneColors.soon.primary }}
          thumbColor={state.eveningEnabled ? "#FFFFFF" : theme.textSecondary}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
