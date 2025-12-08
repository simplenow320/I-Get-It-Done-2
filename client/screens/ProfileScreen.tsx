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
import { LinearGradient } from "expo-linear-gradient";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import StreakBadge from "@/components/StreakBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { useGamification, Level } from "@/stores/GamificationStore";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, "Profile">;
type ThemeMode = "light" | "dark" | "system";

const LEVEL_LABELS: Record<Level, string> = {
  starter: "Starter",
  focused: "Focused",
  productive: "Productive",
  unstoppable: "Unstoppable",
  legendary: "Legendary",
};

const LEVEL_COLORS: Record<Level, string> = {
  starter: LaneColors.later.primary,
  focused: LaneColors.soon.primary,
  productive: LaneColors.now.primary,
  unstoppable: LaneColors.park.primary,
  legendary: "#FFD700",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark, mode, setMode } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { settings } = useTaskStore();
  const {
    currentStreak,
    longestStreak,
    totalTasksCompleted,
    totalFocusMinutes,
    points,
    level,
    getLevelProgress,
    getPointsToNextLevel,
    getWeeklyStats,
    achievements,
  } = useGamification();

  const weeklyStats = getWeeklyStats();
  const levelProgress = getLevelProgress();
  const pointsToNext = getPointsToNextLevel();
  const unlockedAchievements = achievements.filter((a) => a.unlockedAt).length;

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
      <Animated.View entering={FadeInUp.delay(100).duration(400)}>
        <StreakBadge streak={currentStreak} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(150).duration(400)} style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[level] }]}>
            <Feather name="award" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.levelInfo}>
            <ThemedText type="h4">{LEVEL_LABELS[level]}</ThemedText>
            <ThemedText type="small" secondary>
              {points} points
            </ThemedText>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${levelProgress}%`, backgroundColor: LEVEL_COLORS[level] },
              ]}
            />
          </View>
          {pointsToNext > 0 ? (
            <ThemedText type="small" secondary style={styles.progressText}>
              {pointsToNext} points to next level
            </ThemedText>
          ) : (
            <ThemedText type="small" secondary style={styles.progressText}>
              Max level reached
            </ThemedText>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Stats
        </ThemedText>
        <View style={[styles.statsGrid, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.statBox}>
            <ThemedText type="hero" style={[styles.statNumber, { color: LaneColors.now.primary }]}>
              {weeklyStats.tasksCompleted}
            </ThemedText>
            <ThemedText type="small" secondary>
              Tasks This Week
            </ThemedText>
          </View>
          <View style={[styles.statDividerV, { backgroundColor: theme.border }]} />
          <View style={styles.statBox}>
            <ThemedText type="hero" style={[styles.statNumber, { color: LaneColors.soon.primary }]}>
              {weeklyStats.focusMinutes}
            </ThemedText>
            <ThemedText type="small" secondary>
              Focus Minutes
            </ThemedText>
          </View>
        </View>
        <View style={[styles.statsGrid, { backgroundColor: theme.backgroundDefault, marginTop: Spacing.sm }]}>
          <View style={styles.statBox}>
            <ThemedText type="hero" style={[styles.statNumber, { color: LaneColors.later.primary }]}>
              {totalTasksCompleted}
            </ThemedText>
            <ThemedText type="small" secondary>
              Total Tasks
            </ThemedText>
          </View>
          <View style={[styles.statDividerV, { backgroundColor: theme.border }]} />
          <View style={styles.statBox}>
            <ThemedText type="hero" style={[styles.statNumber, { color: LaneColors.park.primary }]}>
              {longestStreak}
            </ThemedText>
            <ThemedText type="small" secondary>
              Best Streak
            </ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(250).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Achievements
        </ThemedText>
        <View style={[styles.achievementsCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.achievementsHeader}>
            <Feather name="star" size={24} color="#FFD700" />
            <ThemedText type="h3" style={styles.achievementsCount}>
              {unlockedAchievements} / {achievements.length}
            </ThemedText>
          </View>
          <View style={styles.achievementsList}>
            {achievements.slice(0, 4).map((achievement) => (
              <View
                key={achievement.id}
                style={[
                  styles.achievementItem,
                  !achievement.unlockedAt && styles.achievementLocked,
                ]}
              >
                <Feather
                  name={achievement.icon as any}
                  size={16}
                  color={achievement.unlockedAt ? LaneColors.now.primary : theme.textSecondary}
                />
              </View>
            ))}
          </View>
          <ThemedText type="small" secondary style={styles.achievementsHint}>
            Complete tasks to unlock more
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
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

      <Animated.View entering={FadeInUp.delay(350).duration(400)}>
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
  levelCard: {
    gap: Spacing.md,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  levelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  levelInfo: {
    flex: 1,
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    textAlign: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 36,
    lineHeight: 40,
  },
  statDividerV: {
    width: 1,
    alignSelf: "stretch",
    marginHorizontal: Spacing.md,
  },
  achievementsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  achievementsCount: {
    fontSize: 24,
  },
  achievementsList: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  achievementItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,59,48,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  achievementLocked: {
    opacity: 0.4,
  },
  achievementsHint: {
    textAlign: "center",
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
