import React, { useMemo, useEffect } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LaneCard } from "@/components/LaneCard";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import QuickDumpButton from "@/components/QuickDumpButton";
import StreakBadge from "@/components/StreakBadge";
import { ThemedText } from "@/components/ThemedText";
import { PaymentStatusBanner } from "@/components/PaymentStatusBanner";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { scheduleProNudgeNotifications, cancelProNudgeNotifications } from "@/lib/notifications";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";
import DailySummaryCard from "@/components/DailySummaryCard";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { tasks, getTasksByLane, unsortedTasks } = useTaskStore();
  const { currentStreak } = useGamification();
  const { isPro, hasProFeatures, freeTrialActive, freeTasksRemaining, lifetimeTasksCreated } = useSubscription();
  const FREE_TASK_LIMIT = 10;
  const SOFT_NUDGE_THRESHOLD = 6;

  useEffect(() => {
    if (hasProFeatures) {
      cancelProNudgeNotifications();
    } else {
      scheduleProNudgeNotifications();
    }
  }, [hasProFeatures]);

  const handleLanePress = (lane: Lane) => {
    navigation.navigate("LaneDetail", { lane });
  };

  const handleAddTask = () => {
    navigation.navigate("AddTask");
  };

  const handleQuickDump = () => {
    navigation.navigate("QuickDump");
  };

  const totalNowTasks = getTasksByLane("now").length;
  const totalSoonTasks = getTasksByLane("soon").length;
  const totalLaterTasks = getTasksByLane("later").length;
  const totalParkTasks = getTasksByLane("park").length;
  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    });
  }, [tasks]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <PaymentStatusBanner />
        
        {hasProFeatures && currentStreak > 0 ? (
          <Animated.View entering={FadeInUp.delay(0).duration(400)} style={styles.streakContainer}>
            <StreakBadge streak={currentStreak} compact />
          </Animated.View>
        ) : null}

        {!hasProFeatures ? (
          <Animated.View entering={FadeInUp.delay(0).duration(400)}>
            <Pressable
              onPress={() => (navigation as any).navigate("ProfileTab", { screen: "Subscription" })}
              style={[styles.proBanner, { backgroundColor: theme.backgroundSecondary }]}
            >
              <View style={styles.proBannerHeader}>
                <View style={[styles.proBannerIcon, { backgroundColor: LaneColors.now.primary + "15" }]}>
                  <Feather name="star" size={16} color={LaneColors.now.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Unlock Pro
                  </ThemedText>
                  <ThemedText type="caption" secondary>
                    Get the full experience
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </View>
              <View style={styles.proBenefitsRow}>
                <View style={styles.proBenefitItem}>
                  <Feather name="mic" size={12} color={LaneColors.later.primary} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>Voice</ThemedText>
                </View>
                <View style={styles.proBenefitItem}>
                  <Feather name="target" size={12} color={LaneColors.later.primary} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>Focus</ThemedText>
                </View>
                <View style={styles.proBenefitItem}>
                  <Feather name="trending-up" size={12} color={LaneColors.later.primary} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>Streaks</ThemedText>
                </View>
                <View style={styles.proBenefitItem}>
                  <Feather name="users" size={12} color={LaneColors.later.primary} />
                  <ThemedText type="caption" secondary style={{ marginLeft: 4 }}>Teams</ThemedText>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ) : freeTrialActive && lifetimeTasksCreated >= SOFT_NUDGE_THRESHOLD ? (
          <Animated.View entering={FadeInUp.delay(0).duration(400)}>
            <Pressable
              onPress={() => (navigation as any).navigate("ProfileTab", { screen: "Subscription" })}
              style={[styles.proBanner, { backgroundColor: theme.backgroundSecondary }]}
            >
              <View style={styles.proBannerHeader}>
                <View style={[styles.proBannerIcon, { backgroundColor: LaneColors.soon.primary + "15" }]}>
                  <Feather name="star" size={16} color={LaneColors.soon.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {freeTasksRemaining} free Pro uses left
                  </ThemedText>
                  <ThemedText type="caption" secondary>
                    Subscribe to keep all features
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </View>
            </Pressable>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(30).duration(400)}>
          <DailySummaryCard
            onStartTask={(taskId) => navigation.navigate("TaskDetail", { taskId })}
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(50).duration(400)}>
          <QuickDumpButton onPress={handleQuickDump} />
          {unsortedTasks.length > 0 ? (
            <View style={styles.unsortedBadge}>
              <ThemedText type="small" secondary>
                {unsortedTasks.length} task{unsortedTasks.length > 1 ? "s" : ""} to sort
              </ThemedText>
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Your Lanes</ThemedText>
        </View>

        <View style={styles.grid}>
          <View style={styles.row}>
            <Animated.View
              entering={FadeInUp.delay(100).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="now"
                count={totalNowTasks}
                onPress={() => handleLanePress("now")}
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(150).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="soon"
                count={totalSoonTasks}
                onPress={() => handleLanePress("soon")}
              />
            </Animated.View>
          </View>
          <View style={styles.row}>
            <Animated.View
              entering={FadeInUp.delay(200).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="later"
                count={totalLaterTasks}
                onPress={() => handleLanePress("later")}
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(250).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="park"
                count={totalParkTasks}
                onPress={() => handleLanePress("park")}
              />
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Pressable onPress={() => navigation.navigate("TaskHistory")} style={styles.doneTodaySection}>
            <View style={styles.doneTodayHeader}>
              <Feather name="check-circle" size={16} color={LaneColors.later.primary} />
              <ThemedText type="small" style={{ color: LaneColors.later.primary, marginLeft: Spacing.xs }}>
                Done Today
              </ThemedText>
              <View style={{ flex: 1 }} />
              <ThemedText type="caption" secondary>
                View All
              </ThemedText>
              <Feather name="chevron-right" size={14} color={theme.textSecondary} style={{ marginLeft: 2 }} />
            </View>
            <View style={[styles.doneTodayCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="h2" style={{ color: LaneColors.later.primary }}>
                {completedToday.length}
              </ThemedText>
              <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
                task{completedToday.length !== 1 ? "s" : ""} completed
              </ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      </ScrollView>
      <FloatingAddButton onPress={handleAddTask} bottom={tabBarHeight + Spacing.lg} />
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
  },
  streakContainer: {
    alignItems: "flex-end",
    marginBottom: Spacing.sm,
  },
  unsortedBadge: {
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  grid: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cardWrapper: {
    flex: 1,
  },
  doneTodaySection: {
    marginTop: Spacing.lg,
  },
  doneTodayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  doneTodayCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  proBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  proBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  proBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  proBenefitsRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.15)",
  },
  proBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
});
