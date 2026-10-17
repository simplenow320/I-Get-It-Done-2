import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
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
import { useTaskStore, LaneTimings } from "@/stores/TaskStore";

interface TimingOption {
  value: string;
  label: string;
}

const timingOptions: Record<keyof LaneTimings, TimingOption[]> = {
  now: [
    { value: "same_day", label: "Same Day" },
    { value: "24_hours", label: "24 Hours" },
  ],
  soon: [
    { value: "2_3_days", label: "2-3 Days" },
    { value: "end_of_week", label: "End of Week" },
  ],
  later: [
    { value: "1_week", label: "1 Week" },
    { value: "2_weeks", label: "2 Weeks" },
  ],
  park: [
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
  ],
};

const laneDescriptions: Record<keyof LaneTimings, string> = {
  now: "Tasks you'll complete today",
  soon: "Tasks coming up in the next few days",
  later: "Tasks for the upcoming weeks",
  park: "Ideas and low priority items",
};

const laneIcons: Record<keyof LaneTimings, keyof typeof Feather.glyphMap> = {
  now: "zap",
  soon: "clock",
  later: "calendar",
  park: "archive",
};

export default function LaneTimingsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { settings, updateSettings } = useTaskStore();
  const [timings, setTimings] = useState<LaneTimings>(settings.laneTimings);

  const handleTimingChange = (lane: keyof LaneTimings, value: string) => {
    Haptics.selectionAsync();
    setTimings((prev) => ({ ...prev, [lane]: value }));
  };

  const handleSave = () => {
    updateSettings({ laneTimings: timings });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

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
          Choose how fast each lane moves
        </ThemedText>

        {(["now", "soon", "later", "park"] as const).map((lane) => (
          <View key={lane} style={styles.laneSection}>
            <View style={styles.laneHeader}>
              <View style={[styles.laneIcon, { backgroundColor: LaneColors[lane].primary }]}>
                <Feather name={laneIcons[lane]} size={18} color="#FFFFFF" />
              </View>
              <View>
                <ThemedText type="h4" style={{ textTransform: "capitalize" }}>
                  {lane}
                </ThemedText>
                <ThemedText type="small" secondary>
                  {laneDescriptions[lane]}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.optionsContainer, { backgroundColor: theme.backgroundDefault }]}>
              {timingOptions[lane].map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleTimingChange(lane, option.value)}
                  style={[
                    styles.option,
                    timings[lane] === option.value && {
                      backgroundColor: LaneColors[lane].primary,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={[
                      styles.optionText,
                      timings[lane] === option.value && { color: "#FFFFFF" },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button title="Save Changes" onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  laneSection: {
    gap: Spacing.sm,
  },
  laneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  laneIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: Spacing.md,
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
