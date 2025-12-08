import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";

export default function WeeklyResetScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { getCompletedTasks, getTasksByLane } = useTaskStore();

  const completedTasks = getCompletedTasks();
  const thisWeekCompleted = completedTasks.filter((t) => {
    if (!t.completedAt) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(t.completedAt) >= weekAgo;
  });

  const lanes: { lane: Lane; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { lane: "now", label: "Now", icon: "zap" },
    { lane: "soon", label: "Soon", icon: "clock" },
    { lane: "later", label: "Later", icon: "calendar" },
    { lane: "park", label: "Park", icon: "archive" },
  ];

  const parkTasks = getTasksByLane("park");
  const hasStuckTasks = parkTasks.length > 5;

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

      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Lane Overview
        </ThemedText>
        <View style={styles.laneGrid}>
          {lanes.map((item, index) => {
            const count = getTasksByLane(item.lane).length;
            return (
              <Animated.View
                key={item.lane}
                entering={FadeInUp.delay(300 + index * 50).duration(300)}
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

      {hasStuckTasks ? (
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={[styles.alertCard, { backgroundColor: `${LaneColors.park.primary}20` }]}
        >
          <View style={styles.alertHeader}>
            <Feather name="alert-circle" size={24} color={LaneColors.park.primary} />
            <ThemedText type="h4" style={{ color: LaneColors.park.primary }}>
              Items Piling Up
            </ThemedText>
          </View>
          <ThemedText type="body" secondary>
            You have {parkTasks.length} items in Park. Consider reviewing and cleaning up old ideas.
          </ThemedText>
        </Animated.View>
      ) : null}

      {thisWeekCompleted.length > 0 ? (
        <Animated.View entering={FadeInUp.delay(600).duration(400)}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Completed This Week
          </ThemedText>
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
                +{thisWeekCompleted.length - 5} more
              </ThemedText>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.motivationCard}>
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
    marginBottom: Spacing.xl,
  },
  heroNumber: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  heroText: {
    fontSize: 56,
  },
  heroLabel: {
    marginBottom: Spacing.xs,
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
  motivationCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  motivationText: {
    textAlign: "center",
  },
});
