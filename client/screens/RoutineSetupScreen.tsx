import React, { useState } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { requestNotificationPermissions } from "@/lib/notifications";
import { OnboardingStackParamList } from "@/navigation/OnboardingStackNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "RoutineSetup">;

const MORNING_ID = "daily_reminder_morning";
const EVENING_ID = "daily_reminder_evening";
const MIDDAY_ID = "daily_reminder_midday";
const STORAGE_KEY_PREFIX = "@daily_reminders_";

interface ReminderOption {
  key: string;
  identifier: string;
  label: string;
  time: string;
  hour: number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  message: { title: string; body: string };
}

const REMINDERS: ReminderOption[] = [
  {
    key: "morning",
    identifier: MORNING_ID,
    label: "Morning game plan",
    time: "8:00 AM",
    hour: 8,
    icon: "sunrise",
    color: LaneColors.soon.primary,
    message: { title: "New day, fresh start", body: "Brain dump what's on your mind and own today." },
  },
  {
    key: "evening",
    identifier: EVENING_ID,
    label: "Evening wind-down",
    time: "8:00 PM",
    hour: 20,
    icon: "moon",
    color: LaneColors.park.primary,
    message: { title: "How'd today go?", body: "Review what you finished and set up tomorrow." },
  },
  {
    key: "midday",
    identifier: MIDDAY_ID,
    label: "Midday reset",
    time: "12:30 PM",
    hour: 12,
    icon: "sun",
    color: LaneColors.later.primary,
    message: { title: "Quick reset", body: "Refocus. What matters right now?" },
  },
];

export default function RoutineSetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { completeOnboarding } = useTaskStore();
  const { user } = useAuth();
  const isWeb = Platform.OS === "web";

  const [selected, setSelected] = useState<Record<string, boolean>>({
    morning: true,
    evening: true,
    midday: false,
  });

  const toggleReminder = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSetup = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (user?.id) {
      const storageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
      const state = {
        morningEnabled: selected.morning,
        morningHour: 8,
        morningMinute: 0,
        middayEnabled: selected.midday,
        middayHour: 12,
        middayMinute: 30,
        eveningEnabled: selected.evening,
        eveningHour: 20,
        eveningMinute: 0,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(state));
    }

    const anyEnabled = Object.values(selected).some(Boolean);
    if (anyEnabled && !isWeb) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        for (const reminder of REMINDERS) {
          if (selected[reminder.key]) {
            try {
              await Notifications.scheduleNotificationAsync({
                identifier: reminder.identifier,
                content: {
                  title: reminder.message.title,
                  body: reminder.message.body,
                  data: { type: "daily_reminder" },
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.DAILY,
                  hour: reminder.hour,
                  minute: reminder.key === "midday" ? 30 : 0,
                },
              });
            } catch {}
          }
        }
      }
    }

    completeOnboarding();
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    completeOnboarding();
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.goBack();
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Pressable
        style={[styles.backButton, { top: insets.top + Spacing.md }]}
        onPress={handleBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="chevron-left" size={28} color={theme.text} />
      </Pressable>

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
              <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
              <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
            </View>
            <ThemedText type="h1" style={styles.title}>
              Build Your Rhythm
            </ThemedText>
            <ThemedText type="body" secondary style={styles.subtitle}>
              Structure makes everything easier. Pick the check-ins that work for you and we'll send a quick nudge to keep you moving.
            </ThemedText>
          </Animated.View>

          <View style={styles.remindersContainer}>
            {REMINDERS.map((reminder, index) => {
              const isOn = selected[reminder.key];
              return (
                <Animated.View key={reminder.key} entering={FadeInUp.delay(100 + index * 80).duration(400)}>
                  <Pressable
                    onPress={() => toggleReminder(reminder.key)}
                    style={[
                      styles.reminderCard,
                      {
                        backgroundColor: isOn ? `${reminder.color}12` : theme.backgroundDefault,
                        borderColor: isOn ? reminder.color : theme.border,
                      },
                    ]}
                  >
                    <View style={[styles.reminderIcon, { backgroundColor: isOn ? reminder.color : theme.backgroundSecondary }]}>
                      <Feather name={reminder.icon} size={20} color={isOn ? "#FFFFFF" : theme.textSecondary} />
                    </View>
                    <View style={styles.reminderText}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {reminder.label}
                      </ThemedText>
                      <ThemedText type="caption" secondary>
                        {reminder.time}
                      </ThemedText>
                    </View>
                    <View style={[styles.checkCircle, { backgroundColor: isOn ? reminder.color : "transparent", borderColor: isOn ? reminder.color : theme.border }]}>
                      {isOn ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.buttonContainer}>
          <Button onPress={handleSetup}>
            {selectedCount > 0 ? "Turn On Reminders" : "Continue"}
          </Button>
          {selectedCount > 0 ? (
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <ThemedText type="body" secondary>
                Skip for now
              </ThemedText>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    left: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  remindersContainer: {
    gap: Spacing.md,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderText: {
    flex: 1,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  skipButton: {
    alignItems: "center",
    padding: Spacing.sm,
  },
});
