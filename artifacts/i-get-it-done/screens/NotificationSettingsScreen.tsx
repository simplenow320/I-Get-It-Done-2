import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable, Switch, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

type Intensity = "gentle" | "standard" | "relentless";

const INTENSITY_OPTIONS: { value: Intensity; label: string; description: string }[] = [
  { value: "gentle", label: "Gentle", description: "One nudge a day per task" },
  { value: "standard", label: "Standard", description: "Follow-ups every few hours" },
  { value: "relentless", label: "Relentless", description: "Every 90 minutes until it's done" },
];

const MORNING_HOURS = [6, 7, 8, 9, 10];
const EVENING_HOURS = [17, 18, 19, 20, 21];

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function formatHour(h: number): string {
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [intensity, setIntensity] = useState<Intensity>("standard");
  const [escalating, setEscalating] = useState(true);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);
  const [streakSaver, setStreakSaver] = useState(true);
  const [morningHour, setMorningHour] = useState(8);
  const [eveningHour, setEveningHour] = useState(19);

  const [deliveryActive, setDeliveryActive] = useState<boolean | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/users/${user.id}/notification-settings`);
        const data = await res.json();
        if (cancelled) return;
        const active =
          Platform.OS === "web"
            ? !!data.hasWebPushSubscription
            : !!data.hasPushToken && !!data.notificationsEnabled;
        setDeliveryActive(active);
      } catch {
        if (!cancelled) setDeliveryActive(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/users/${user.id}/notification-prefs`);
        const data = await res.json();
        if (cancelled || !data?.prefs) return;
        const p = data.prefs;
        if (p.notificationIntensity) setIntensity(p.notificationIntensity);
        if (typeof p.escalatingRemindersEnabled === "boolean") setEscalating(p.escalatingRemindersEnabled);
        if (typeof p.morningKickoffEnabled === "boolean") setMorning(p.morningKickoffEnabled);
        if (typeof p.eveningCheckinEnabled === "boolean") setEvening(p.eveningCheckinEnabled);
        if (typeof p.streakSaverEnabled === "boolean") setStreakSaver(p.streakSaverEnabled);
        if (typeof p.morningKickoffHour === "number") setMorningHour(p.morningKickoffHour);
        if (typeof p.eveningCheckinHour === "number") setEveningHour(p.eveningCheckinHour);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleSendTest = async () => {
    setIsSendingTest(true);
    try {
      await apiRequest("POST", "/api/notifications/test");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showMessage("Test sent", "A test notification is on its way. You should see it in a moment.");
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : "";
      if (message.includes("No push token")) {
        showEnablePrompt();
      } else {
        showMessage("Couldn't send test", "Something went wrong sending the test notification. Please try again.");
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const showEnablePrompt = () => {
    if (Platform.OS === "web") {
      showMessage(
        "Notifications not set up",
        "Enable browser notifications from your profile to receive reminders on this device."
      );
      return;
    }
    Alert.alert(
      "Notifications not set up",
      "This device isn't registered for push notifications. Open Settings and allow notifications for this app, then return here.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ]
    );
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/users/${user.id}/notification-prefs`, {
        notificationIntensity: intensity,
        escalatingRemindersEnabled: escalating,
        morningKickoffEnabled: morning,
        eveningCheckinEnabled: evening,
        streakSaverEnabled: streakSaver,
        morningKickoffHour: morningHour,
        eveningCheckinHour: eveningHour,
        timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  const toggleRow = (
    icon: keyof typeof Feather.glyphMap,
    color: string,
    title: string,
    description: string,
    value: boolean,
    onChange: (v: boolean) => void
  ) => (
    <View style={[styles.toggleRow, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.rowIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={18} color="#FFFFFF" />
      </View>
      <View style={styles.rowContent}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {title}
        </ThemedText>
        <ThemedText type="small" secondary>
          {description}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
      />
    </View>
  );

  const hourPicker = (hours: number[], selected: number, onSelect: (h: number) => void) => (
    <View style={[styles.optionsContainer, { backgroundColor: theme.backgroundDefault }]}>
      {hours.map((h) => (
        <Pressable
          key={h}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(h);
          }}
          style={[styles.option, selected === h && { backgroundColor: LaneColors.soon.primary }]}
        >
          <ThemedText type="small" style={[styles.optionText, selected === h && { color: "#FFFFFF" }]}>
            {formatHour(h)}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ThemedText type="body" secondary style={styles.description}>
          Built for busy brains — you choose how hard the app pushes you
        </ThemedText>

        {loadError ? (
          <ThemedText type="small" secondary style={styles.description}>
            Couldn't load saved settings — showing defaults.
          </ThemedText>
        ) : null}

        <View style={styles.section}>
          <ThemedText type="h4">Delivery status</ThemedText>
          <View style={[styles.toggleRow, { backgroundColor: theme.backgroundDefault }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: deliveryActive ? "#34C759" : "#FF3B30" },
              ]}
            />
            <View style={styles.rowContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {deliveryActive ? "Notifications active" : "Not receiving notifications"}
              </ThemedText>
              <ThemedText type="small" secondary>
                {deliveryActive
                  ? "This device is registered for push notifications"
                  : "This device isn't set up to receive notifications"}
              </ThemedText>
            </View>
          </View>
          {deliveryActive === false ? (
            <Pressable
              onPress={showEnablePrompt}
              style={[styles.toggleRow, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#FF3B30" }]}>
                <Feather name="alert-circle" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.rowContent}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  Fix notifications
                </ThemedText>
                <ThemedText type="small" secondary>
                  {Platform.OS === "web"
                    ? "Enable browser notifications to get reminders"
                    : "Re-enable notifications in Settings"}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleSendTest}
            disabled={isSendingTest}
            style={[
              styles.toggleRow,
              { backgroundColor: theme.backgroundDefault, opacity: isSendingTest ? 0.6 : 1 },
            ]}
          >
            <View style={[styles.rowIcon, { backgroundColor: LaneColors.soon.primary }]}>
              <Feather name="send" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.rowContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {isSendingTest ? "Sending..." : "Send test notification"}
              </ThemedText>
              <ThemedText type="small" secondary>
                Check that notifications reach this device
              </ThemedText>
            </View>
            {isSendingTest ? <ActivityIndicator size="small" color={theme.text} /> : null}
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4">Reminder intensity</ThemedText>
          {INTENSITY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => {
                Haptics.selectionAsync();
                setIntensity(opt.value);
              }}
              style={[
                styles.intensityCard,
                { backgroundColor: theme.backgroundDefault },
                intensity === opt.value && { borderColor: LaneColors.now.primary, borderWidth: 2 },
              ]}
            >
              <View style={styles.rowContent}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {opt.label}
                </ThemedText>
                <ThemedText type="small" secondary>
                  {opt.description}
                </ThemedText>
              </View>
              {intensity === opt.value ? (
                <Feather name="check-circle" size={20} color={LaneColors.now.primary} />
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="h4">What you'll get</ThemedText>
          {toggleRow(
            "repeat",
            LaneColors.now.primary,
            "Escalating reminders",
            "Nudges repeat and get firmer until a task is done",
            escalating,
            setEscalating
          )}
          {toggleRow(
            "sunrise",
            LaneColors.soon.primary,
            "Morning kickoff",
            "Pick your ONE thing to start the day",
            morning,
            setMorning
          )}
          {toggleRow(
            "moon",
            LaneColors.later.primary,
            "Evening check-in",
            "What's left today — still doable",
            evening,
            setEvening
          )}
          {toggleRow(
            "zap",
            LaneColors.park.primary,
            "Streak saver",
            "Urgent alert when your streak is about to die",
            streakSaver,
            setStreakSaver
          )}
        </View>

        {morning ? (
          <View style={styles.section}>
            <ThemedText type="h4">Morning kickoff time</ThemedText>
            {hourPicker(MORNING_HOURS, morningHour, setMorningHour)}
          </View>
        ) : null}

        {evening ? (
          <View style={styles.section}>
            <ThemedText type="h4">Evening check-in time</ThemedText>
            {hourPicker(EVENING_HOURS, eveningHour, setEveningHour)}
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={handleSave} disabled={isSaving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  intensityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: Spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  optionsContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  optionText: {
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
