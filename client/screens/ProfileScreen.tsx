import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, "Profile">;
type ThemeMode = "light" | "dark" | "system";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark, mode, setMode } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getCompletedTasks, settings } = useTaskStore();

  const completedTasks = getCompletedTasks();
  const thisWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.completedAt) >= weekAgo;
  }).length;

  const handleWeeklyReset = () => {
    navigation.navigate("WeeklyReset");
  };

  const handleThemeChange = (newMode: ThemeMode) => {
    Haptics.selectionAsync();
    setMode(newMode);
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: "light", label: "Light", icon: "sun" },
    { mode: "dark", label: "Dark", icon: "moon" },
    { mode: "system", label: "Auto", icon: "smartphone" },
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.statsCard}>
        <View style={[styles.avatarContainer, { backgroundColor: LaneColors.now.primary }]}>
          <Feather name="user" size={40} color="#FFFFFF" />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="hero" style={styles.statNumber}>
              {thisWeekCompleted}
            </ThemedText>
            <ThemedText type="small" secondary>
              This Week
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="hero" style={styles.statNumber}>
              {completedTasks.length}
            </ThemedText>
            <ThemedText type="small" secondary>
              All Time
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Appearance
        </ThemedText>
        <View style={[styles.themeSelector, { backgroundColor: theme.backgroundDefault }]}>
          {themeOptions.map((option) => (
            <Pressable
              key={option.mode}
              onPress={() => handleThemeChange(option.mode)}
              style={[
                styles.themeOption,
                mode === option.mode && {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                },
              ]}
            >
              <Feather
                name={option.icon as any}
                size={20}
                color={mode === option.mode ? LaneColors.now.primary : theme.textSecondary}
              />
              <ThemedText
                type="small"
                style={[
                  styles.themeLabel,
                  mode === option.mode && { color: LaneColors.now.primary, fontWeight: "600" },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Quick Actions
        </ThemedText>
        <Pressable
          onPress={handleWeeklyReset}
          style={({ pressed }) => [
            styles.menuItem,
            { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: LaneColors.soon.primary }]}>
            <Feather name="refresh-cw" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.menuContent}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Weekly Reset
            </ThemedText>
            <ThemedText type="small" secondary>
              Review your progress
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Settings
        </ThemedText>
        <View style={[styles.menuGroup, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.menuItemInGroup}>
            <View style={[styles.menuIcon, { backgroundColor: LaneColors.later.primary }]}>
              <Feather name="sliders" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                Lane Timings
              </ThemedText>
              <ThemedText type="small" secondary>
                {settings.laneTimings.now === "same_day" ? "Same Day" : "24 Hours"} / {settings.laneTimings.soon === "2_3_days" ? "2-3 Days" : "End of Week"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <View style={styles.menuItemInGroup}>
            <View style={[styles.menuIcon, { backgroundColor: LaneColors.park.primary }]}>
              <Feather name={settings.mode === "solo" ? "user" : "users"} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.menuContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                Mode
              </ThemedText>
              <ThemedText type="small" secondary>
                {settings.mode === "solo" ? "Solo" : "Team"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </View>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  statsCard: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  statNumber: {
    fontSize: 48,
  },
  statDivider: {
    width: 1,
    height: 60,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  themeSelector: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  themeOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  themeLabel: {
    fontSize: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  menuItemInGroup: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  menuGroup: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  menuContent: {
    flex: 1,
  },
  menuDivider: {
    height: 1,
    marginLeft: 56,
  },
});
