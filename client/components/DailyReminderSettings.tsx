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
const MIDDAY_ID = "daily_reminder_midday";

interface ReminderState {
  morningEnabled: boolean;
  morningHour: number;
  morningMinute: number;
  eveningEnabled: boolean;
  eveningHour: number;
  eveningMinute: number;
  middayEnabled: boolean;
  middayHour: number;
  middayMinute: number;
}

const DEFAULT_STATE: ReminderState = {
  morningEnabled: false,
  morningHour: 8,
  morningMinute: 0,
  eveningEnabled: false,
  eveningHour: 20,
  eveningMinute: 0,
  middayEnabled: false,
  middayHour: 12,
  middayMinute: 30,
};

const MORNING_MESSAGES = [
  { title: "Start your day", body: "Get it out of your head." },
  { title: "Quick brain dump", body: "Before the day runs you." },
  { title: "Clear your head", body: "What's on your mind?" },
];

const EVENING_MESSAGES = [
  { title: "Wrap your day", body: "Clear your mind." },
  { title: "What did you finish today?", body: "Check it off and let it go." },
  { title: "Don't carry it into tomorrow", body: "Dump it." },
];

const MIDDAY_MESSAGES = [
  { title: "Quick reset", body: "What's still on your plate?" },
  { title: "Refocus", body: "What matters right now?" },
  { title: "Take 30 seconds", body: "Reset your day." },
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

  const handleMiddayToggle = async () => {
    if (isWeb) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!state.middayEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      await scheduleDailyReminder(MIDDAY_ID, state.middayHour, state.middayMinute, MIDDAY_MESSAGES);
      persist({ ...state, middayEnabled: true });
    } else {
      await cancelDailyReminder(MIDDAY_ID);
      persist({ ...state, middayEnabled: false });
    }
  };

  const cycleTime = async (
    type: "morning" | "evening" | "midday",
    direction: "up" | "down"
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const config = {
      morning: { hourKey: "morningHour" as const, enabledKey: "morningEnabled" as const, minuteKey: "morningMinute" as const, identifier: MORNING_ID, messages: MORNING_MESSAGES },
      evening: { hourKey: "eveningHour" as const, enabledKey: "eveningEnabled" as const, minuteKey: "eveningMinute" as const, identifier: EVENING_ID, messages: EVENING_MESSAGES },
      midday: { hourKey: "middayHour" as const, enabledKey: "middayEnabled" as const, minuteKey: "middayMinute" as const, identifier: MIDDAY_ID, messages: MIDDAY_MESSAGES },
    }[type];

    let newHour = state[config.hourKey] + (direction === "up" ? 1 : -1);
    if (newHour > 23) newHour = 0;
    if (newHour < 0) newHour = 23;

    const next = { ...state, [config.hourKey]: newHour };
    await persist(next);

    if (next[config.enabledKey]) {
      await scheduleDailyReminder(config.identifier, newHour, next[config.minuteKey], config.messages);
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
          <ThemedText style={styles.label}>Midday reset</ThemedText>
          {state.middayEnabled ? (
            <View style={styles.timeRow}>
              <Pressable onPress={() => cycleTime("midday", "down")} hitSlop={8}>
                <Feather name="minus" size={14} color={theme.textSecondary} />
              </Pressable>
              <ThemedText type="caption" style={{ color: LaneColors.later.primary, marginHorizontal: Spacing.xs }}>
                {formatTime(state.middayHour, state.middayMinute)}
              </ThemedText>
              <Pressable onPress={() => cycleTime("midday", "up")} hitSlop={8}>
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
          value={state.middayEnabled}
          onValueChange={handleMiddayToggle}
          disabled={isWeb}
          trackColor={{ false: theme.border, true: LaneColors.later.primary }}
          thumbColor={state.middayEnabled ? "#FFFFFF" : theme.textSecondary}
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
