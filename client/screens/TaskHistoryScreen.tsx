import React, { useMemo, useState, useCallback } from "react";
import { StyleSheet, View, FlatList, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Task } from "@/stores/TaskStore";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, "TaskHistory">;

type FilterType = "all" | "today" | "week" | "month";

const filterLabels: Record<FilterType, string> = {
  all: "All",
  today: "Today",
  week: "This Week",
  month: "This Month",
};

function getDateRange(filter: FilterType): Date | null {
  if (filter === "all") return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (filter === "today") return now;
  if (filter === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo;
  }
  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return monthAgo;
}

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: now.getFullYear() !== date.getFullYear() ? "numeric" : undefined });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface GroupedTasks {
  label: string;
  data: Task[];
}

export default function TaskHistoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getCompletedTasks } = useTaskStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredTasks = useMemo(() => {
    const completed = getCompletedTasks();
    const cutoff = getDateRange(activeFilter);

    const filtered = cutoff
      ? completed.filter((t) => t.completedAt && new Date(t.completedAt) >= cutoff)
      : completed;

    return filtered.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [getCompletedTasks, activeFilter]);

  const groupedTasks = useMemo((): GroupedTasks[] => {
    const groups: Record<string, Task[]> = {};
    const groupOrder: string[] = [];

    filteredTasks.forEach((task) => {
      if (!task.completedAt) return;
      const date = new Date(task.completedAt);
      const label = formatDate(date);
      if (!groups[label]) {
        groups[label] = [];
        groupOrder.push(label);
      }
      groups[label].push(task);
    });

    return groupOrder.map((label) => ({ label, data: groups[label] }));
  }, [filteredTasks]);

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate("TaskDetail", { taskId: task.id });
  }, [navigation]);

  const laneColor = (lane: string) => {
    switch (lane) {
      case "now": return LaneColors.now.primary;
      case "soon": return LaneColors.soon.primary;
      case "later": return LaneColors.later.primary;
      case "park": return LaneColors.park.primary;
      default: return theme.textSecondary;
    }
  };

  const renderTaskItem = useCallback(({ item }: { item: Task }) => {
    const completedDate = item.completedAt ? new Date(item.completedAt) : null;
    const completedSubtasks = item.subtasks.filter((s) => s.completed).length;

    return (
      <Pressable
        onPress={() => handleTaskPress(item)}
        style={[styles.taskItem, { backgroundColor: theme.backgroundSecondary }]}
      >
        <View style={styles.taskItemLeft}>
          <View style={[styles.checkCircle, { borderColor: LaneColors.later.primary }]}>
            <Feather name="check" size={12} color={LaneColors.later.primary} />
          </View>
          <View style={styles.taskInfo}>
            <ThemedText type="body" style={styles.taskTitle} numberOfLines={2}>
              {item.title}
            </ThemedText>
            <View style={styles.taskMeta}>
              <View style={[styles.lanePill, { backgroundColor: laneColor(item.lane) + "20" }]}>
                <ThemedText type="caption" style={{ color: laneColor(item.lane), fontWeight: "600" }}>
                  {item.lane.charAt(0).toUpperCase() + item.lane.slice(1)}
                </ThemedText>
              </View>
              {item.subtasks.length > 0 ? (
                <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
                  {completedSubtasks}/{item.subtasks.length} subtasks
                </ThemedText>
              ) : null}
              {completedDate ? (
                <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
                  {formatTime(completedDate)}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </View>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
      </Pressable>
    );
  }, [theme, handleTaskPress]);

  const renderSectionHeader = (label: string, count: number) => (
    <View style={styles.sectionHeader}>
      <ThemedText type="small" secondary style={{ fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </ThemedText>
      <ThemedText type="caption" secondary>
        {count} task{count !== 1 ? "s" : ""}
      </ThemedText>
    </View>
  );

  const renderGroup = ({ item, index }: { item: GroupedTasks; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
      {renderSectionHeader(item.label, item.data.length)}
      {item.data.map((task) => (
        <View key={task.id}>{renderTaskItem({ item: task })}</View>
      ))}
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color={theme.textSecondary} />
      <ThemedText type="h4" secondary style={{ marginTop: Spacing.lg }}>
        No Completed Tasks
      </ThemedText>
      <ThemedText type="body" secondary style={{ marginTop: Spacing.sm, textAlign: "center" }}>
        Tasks you complete will appear here so you can see everything you've accomplished.
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.filterBar, { paddingTop: headerHeight + Spacing.sm }]}>
        <View style={styles.filterRow}>
          {(Object.keys(filterLabels) as FilterType[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === filter ? LaneColors.later.primary : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: activeFilter === filter ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600",
                }}
              >
                {filterLabels[filter]}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.summaryRow}>
          <Feather name="check-circle" size={14} color={LaneColors.later.primary} />
          <ThemedText type="small" style={{ color: LaneColors.later.primary, marginLeft: Spacing.xs }}>
            {filteredTasks.length} completed
          </ThemedText>
        </View>
      </View>

      <FlatList
        data={groupedTasks}
        renderItem={renderGroup}
        keyExtractor={(item) => item.label}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          groupedTasks.length === 0 ? styles.emptyList : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  taskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  lanePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.round,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
});
