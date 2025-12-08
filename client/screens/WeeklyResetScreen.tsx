import React, { useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane, Task } from "@/stores/TaskStore";
import { useGamification, Level } from "@/stores/GamificationStore";

const STALE_DAYS_PARK = 14;
const STALE_DAYS_SOON = 7;

const LEVELS: { name: Level; minPoints: number; color: string }[] = [
  { name: "starter", minPoints: 0, color: "#8E8E93" },
  { name: "focused", minPoints: 100, color: "#007AFF" },
  { name: "productive", minPoints: 500, color: "#34C759" },
  { name: "unstoppable", minPoints: 1500, color: "#FF9500" },
  { name: "legendary", minPoints: 5000, color: "#AF52DE" },
];

export default function WeeklyResetScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { getCompletedTasks, getTasksByLane, moveTask } = useTaskStore();
  const gamification = useGamification();

  const completedTasks = getCompletedTasks();
  
  const thisWeekCompleted = useMemo(() => {
    return completedTasks.filter((t) => {
      if (!t.completedAt) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.completedAt) >= weekAgo;
    });
  }, [completedTasks]);

  const lanes: { lane: Lane; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { lane: "now", label: "Now", icon: "zap" },
    { lane: "soon", label: "Soon", icon: "clock" },
    { lane: "later", label: "Later", icon: "calendar" },
    { lane: "park", label: "Park", icon: "archive" },
  ];

  const parkTasks = getTasksByLane("park");
  const soonTasks = getTasksByLane("soon");
  const nowTasks = getTasksByLane("now");
  const laterTasks = getTasksByLane("later");

  const staleParkTasks = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS_PARK);
    return parkTasks.filter((t) => new Date(t.createdAt) < cutoff);
  }, [parkTasks]);

  const staleSoonTasks = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - STALE_DAYS_SOON);
    return soonTasks.filter((t) => new Date(t.createdAt) < cutoff);
  }, [soonTasks]);

  const recentAchievements = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return gamification.achievements.filter((a) => {
      if (!a.unlockedAt) return false;
      return new Date(a.unlockedAt) >= weekAgo;
    });
  }, [gamification.achievements]);

  const currentLevel = LEVELS.find((l) => l.name === gamification.level);
  const nextLevel = LEVELS.find((l) => l.minPoints > (currentLevel?.minPoints || 0));
  const progressToNext = nextLevel
    ? ((gamification.points - (currentLevel?.minPoints || 0)) / (nextLevel.minPoints - (currentLevel?.minPoints || 0))) * 100
    : 100;

  const handleMoveToLater = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    moveTask(task.id, "later");
  };

  const handleMoveToNow = (task: Task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    moveTask(task.id, "now");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
        <View style={[styles.heroNumber, { backgroundColor: LaneColors.now.primary }]}>
          <ThemedText
            type="hero"
            style={styles.heroText}
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
          >
            {thisWeekCompleted.length}
          </ThemedText>
        </View>
        <ThemedText type="h2" style={styles.heroLabel}>
          Tasks Completed
        </ThemedText>
        <ThemedText type="body" secondary>
          This week
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.statsSection}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: LaneColors.soon.primary }]}>
              <Feather name="zap" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="h3">{gamification.currentStreak}</ThemedText>
            <ThemedText type="small" secondary>Day Streak</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: LaneColors.later.primary }]}>
              <Feather name="star" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="h3">{gamification.points}</ThemedText>
            <ThemedText type="small" secondary>Points</ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.statIcon, { backgroundColor: LaneColors.park.primary }]}>
              <Feather name="award" size={16} color="#FFFFFF" />
            </View>
            <ThemedText type="h3" numberOfLines={1} style={{ fontSize: 18 }}>{gamification.level}</ThemedText>
            <ThemedText type="small" secondary>Level</ThemedText>
          </View>
        </View>
        
        {nextLevel ? (
          <View style={[styles.progressContainer, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.progressHeader}>
              <ThemedText type="small" secondary>Progress to {nextLevel.name}</ThemedText>
              <ThemedText type="small" secondary>{Math.round(progressToNext)}%</ThemedText>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressToNext, 100)}%`, backgroundColor: currentLevel?.color || theme.link },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.progressContainer, { backgroundColor: `${LEVELS[4].color}20` }]}>
            <View style={styles.maxLevelRow}>
              <Feather name="award" size={20} color={LEVELS[4].color} />
              <ThemedText type="body" style={{ color: LEVELS[4].color, fontWeight: "600" }}>
                You reached Legendary status!
              </ThemedText>
            </View>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Lane Overview
        </ThemedText>
        <View style={styles.laneGrid}>
          {lanes.map((item, index) => {
            const count = getTasksByLane(item.lane).length;
            return (
              <Animated.View
                key={item.lane}
                entering={FadeInUp.delay(400 + index * 50).duration(300)}
                style={[styles.laneOverviewCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneOverviewIcon, { backgroundColor: LaneColors[item.lane].primary }]}>
                  <Feather name={item.icon} size={18} color="#FFFFFF" />
                </View>
                <ThemedText type="h3">{count}</ThemedText>
                <ThemedText type="small" secondary>
                  {item.label}
                </ThemedText>
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>

      {staleSoonTasks.length > 0 ? (
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={[styles.alertCard, { backgroundColor: `${LaneColors.soon.primary}15` }]}
        >
          <View style={styles.alertHeader}>
            <Feather name="clock" size={24} color={LaneColors.soon.primary} />
            <ThemedText type="h4" style={{ color: LaneColors.soon.primary }}>
              Stuck in Soon
            </ThemedText>
          </View>
          <ThemedText type="body" secondary style={{ marginBottom: Spacing.sm }}>
            {staleSoonTasks.length} task{staleSoonTasks.length > 1 ? "s have" : " has"} been in Soon for over a week.
          </ThemedText>
          {staleSoonTasks.slice(0, 3).map((task) => (
            <View key={task.id} style={styles.staleTaskRow}>
              <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                {task.title}
              </ThemedText>
              <View style={styles.staleActions}>
                <Pressable
                  onPress={() => handleMoveToNow(task)}
                  style={[styles.staleButton, { backgroundColor: LaneColors.now.primary }]}
                >
                  <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF">Now</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => handleMoveToLater(task)}
                  style={[styles.staleButton, { backgroundColor: LaneColors.later.primary }]}
                >
                  <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF">Later</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {staleParkTasks.length > 0 ? (
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={[styles.alertCard, { backgroundColor: `${LaneColors.park.primary}15` }]}
        >
          <View style={styles.alertHeader}>
            <Feather name="archive" size={24} color={LaneColors.park.primary} />
            <ThemedText type="h4" style={{ color: LaneColors.park.primary }}>
              Old Parked Items
            </ThemedText>
          </View>
          <ThemedText type="body" secondary style={{ marginBottom: Spacing.sm }}>
            {staleParkTasks.length} item{staleParkTasks.length > 1 ? "s have" : " has"} been parked for 2+ weeks. Time to decide?
          </ThemedText>
          {staleParkTasks.slice(0, 3).map((task) => (
            <View key={task.id} style={styles.staleTaskRow}>
              <ThemedText type="body" numberOfLines={1} style={{ flex: 1 }}>
                {task.title}
              </ThemedText>
              <View style={styles.staleActions}>
                <Pressable
                  onPress={() => handleMoveToLater(task)}
                  style={[styles.staleButton, { backgroundColor: LaneColors.later.primary }]}
                >
                  <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF">Later</ThemedText>
                </Pressable>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}

      {(thisWeekCompleted.length > 0 || recentAchievements.length > 0 || gamification.currentStreak >= 3) ? (
        <Animated.View entering={FadeInUp.delay(700).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Wins This Week
          </ThemedText>
          
          {gamification.currentStreak >= 3 ? (
            <View style={[styles.streakHighlight, { backgroundColor: `${LaneColors.soon.primary}20` }]}>
              <Feather name="zap" size={24} color={LaneColors.soon.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "600", color: LaneColors.soon.primary }}>
                  {gamification.currentStreak}-Day Streak!
                </ThemedText>
                <ThemedText type="small" secondary>
                  You're on fire! Keep it going.
                </ThemedText>
              </View>
            </View>
          ) : null}
          
          {recentAchievements.length > 0 ? (
            <View style={[styles.achievementsList, { backgroundColor: `${LaneColors.park.primary}15` }]}>
              <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                New Achievements
              </ThemedText>
              {recentAchievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <Feather name={achievement.icon as keyof typeof Feather.glyphMap} size={18} color={LaneColors.park.primary} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>{achievement.title}</ThemedText>
                    <ThemedText type="small" secondary>{achievement.description}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          
          {thisWeekCompleted.length > 0 ? (
            <View style={[styles.completedList, { backgroundColor: theme.backgroundDefault }]}>
              {thisWeekCompleted.slice(0, 5).map((task, index) => (
                <View
                  key={task.id}
                  style={[
                    styles.completedItem,
                    index < Math.min(thisWeekCompleted.length, 5) - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <Feather name="check-circle" size={20} color={theme.success} />
                  <ThemedText type="body" numberOfLines={1} style={styles.completedText}>
                    {task.title}
                  </ThemedText>
                </View>
              ))}
              {thisWeekCompleted.length > 5 ? (
                <ThemedText type="small" secondary style={styles.moreText}>
                  +{thisWeekCompleted.length - 5} more wins
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.delay(800).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Next Week
        </ThemedText>
        <View style={[styles.nextWeekCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.nextWeekRow}>
            <View style={[styles.nextWeekIcon, { backgroundColor: LaneColors.now.primary }]}>
              <Feather name="zap" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {nowTasks.length} task{nowTasks.length !== 1 ? "s" : ""} ready for Now
              </ThemedText>
              <ThemedText type="small" secondary>
                {nowTasks.length === 0 ? "Add tasks to get started" : "Focus on these first"}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.nextWeekRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={[styles.nextWeekIcon, { backgroundColor: LaneColors.soon.primary }]}>
              <Feather name="clock" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {soonTasks.length} task{soonTasks.length !== 1 ? "s" : ""} coming up Soon
              </ThemedText>
              <ThemedText type="small" secondary>
                {soonTasks.length === 0 ? "Move from Later when ready" : "These will need attention soon"}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.nextWeekRow, { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={[styles.nextWeekIcon, { backgroundColor: LaneColors.later.primary }]}>
              <Feather name="target" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Weekly goal suggestion
              </ThemedText>
              <ThemedText type="small" secondary>
                {gamification.currentStreak > 0
                  ? `Keep your ${gamification.currentStreak}-day streak alive`
                  : "Complete 1 task to start a streak"}
              </ThemedText>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(900).duration(400)} style={styles.motivationCard}>
        <ThemedText type="h3" style={styles.motivationText}>
          {thisWeekCompleted.length >= 10
            ? "Incredible week! Keep crushing it."
            : thisWeekCompleted.length >= 5
            ? "Solid progress. You're on track."
            : thisWeekCompleted.length > 0
            ? "Good start. Small wins add up."
            : "New week, fresh start. Let's go."}
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroNumber: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  heroText: {
    fontSize: 48,
  },
  heroLabel: {
    marginBottom: Spacing.xs,
  },
  statsSection: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  maxLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  laneGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  laneOverviewCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  laneOverviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  alertCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  staleTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  staleActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  staleButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  streakHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  achievementsList: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  completedList: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  completedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  completedText: {
    flex: 1,
  },
  moreText: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  nextWeekCard: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  nextWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  nextWeekIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  motivationCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  motivationText: {
    textAlign: "center",
  },
});
