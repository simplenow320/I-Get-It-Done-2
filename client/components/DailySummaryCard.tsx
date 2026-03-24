import React, { useMemo } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";

interface DailySummaryCardProps {
  onStartTask?: (taskId: string) => void;
}

export default function DailySummaryCard({ onStartTask }: DailySummaryCardProps) {
  const { theme } = useTheme();
  const { tasks, getTasksByLane } = useTaskStore();
  const { currentStreak, dailyStats } = useGamification();

  const yesterdayCompleted = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    const stat = dailyStats.find((s) => s.date === dateStr);
    return stat?.tasksCompleted || 0;
  }, [dailyStats]);

  const suggestedTask = useMemo(() => {
    const nowTasks = getTasksByLane("now");
    if (nowTasks.length > 0) return nowTasks[0];
    const soonTasks = getTasksByLane("soon");
    if (soonTasks.length > 0) return soonTasks[0];
    return null;
  }, [getTasksByLane]);

  const todayCompleted = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (!task.completedAt) return false;
      const d = new Date(task.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
  }, [tasks]);

  const hasContent = yesterdayCompleted > 0 || currentStreak > 0 || suggestedTask;

  if (!hasContent) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.header}>
        <Feather name="sunrise" size={14} color={LaneColors.soon.primary} />
        <ThemedText type="caption" style={{ color: LaneColors.soon.primary, marginLeft: Spacing.xs, fontWeight: "600" }}>
          Your Day
        </ThemedText>
      </View>

      <View style={styles.statsRow}>
        {yesterdayCompleted > 0 ? (
          <View style={styles.statItem}>
            <ThemedText type="h4" style={{ color: LaneColors.later.primary }}>
              {yesterdayCompleted}
            </ThemedText>
            <ThemedText type="caption" secondary>
              done yesterday
            </ThemedText>
          </View>
        ) : null}

        {todayCompleted > 0 ? (
          <View style={styles.statItem}>
            <ThemedText type="h4" style={{ color: LaneColors.later.primary }}>
              {todayCompleted}
            </ThemedText>
            <ThemedText type="caption" secondary>
              done today
            </ThemedText>
          </View>
        ) : null}

        {currentStreak > 0 ? (
          <View style={styles.statItem}>
            <ThemedText type="h4" style={{ color: LaneColors.now.primary }}>
              {currentStreak}
            </ThemedText>
            <ThemedText type="caption" secondary>
              day streak
            </ThemedText>
          </View>
        ) : null}
      </View>

      {suggestedTask ? (
        <Pressable
          onPress={() => onStartTask?.(suggestedTask.id)}
          style={[styles.suggestedRow, { borderTopColor: theme.border }]}
        >
          <View style={[styles.suggestedDot, { backgroundColor: LaneColors[suggestedTask.lane || "now"].primary }]} />
          <View style={{ flex: 1 }}>
            <ThemedText type="caption" secondary>
              Start here
            </ThemedText>
            <ThemedText type="small" numberOfLines={1}>
              {suggestedTask.title}
            </ThemedText>
          </View>
          <Feather name="arrow-right" size={14} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statItem: {
    alignItems: "center",
  },
  suggestedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
