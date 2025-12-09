import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, LaneTimings } from "@/stores/TaskStore";
import { OnboardingStackParamList } from "@/navigation/OnboardingStackNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "LaneSetup">;

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

export default function LaneSetupScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { settings, updateSettings } = useTaskStore();
  const [timings, setTimings] = useState<LaneTimings>(settings.laneTimings);

  const handleTimingChange = (lane: keyof LaneTimings, value: string) => {
    Haptics.selectionAsync();
    setTimings((prev) => ({ ...prev, [lane]: value }));
  };

  const handleContinue = () => {
    updateSettings({ laneTimings: timings });
    navigation.navigate("ModeSelection");
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Pressable
        style={[styles.backButton, { top: insets.top + Spacing.md }]}
        onPress={handleBack}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="chevron-left" size={28} color={theme.text} />
      </Pressable>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: 120 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
            <View style={[styles.progressDot, { backgroundColor: theme.backgroundTertiary }]} />
          </View>
          <ThemedText type="h1" style={styles.title}>
            Set Your Pace
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Choose how fast each lane moves
          </ThemedText>
        </View>

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
                      timings[lane] === option.value && styles.optionTextSelected,
                    ]}
                    lightColor={timings[lane] === option.value ? "#FFFFFF" : theme.text}
                    darkColor={timings[lane] === option.value ? "#FFFFFF" : theme.text}
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
          styles.buttonContainer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <Button onPress={handleContinue}>Continue</Button>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
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
    marginBottom: Spacing.xs,
  },
  subtitle: {},
  laneSection: {
    marginBottom: Spacing.lg,
  },
  laneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
    borderRadius: BorderRadius.sm,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  optionText: {
    fontWeight: "500",
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
});
