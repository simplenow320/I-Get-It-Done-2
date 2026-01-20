import React, { useMemo } from "react";
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
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getTasksByLane, unsortedTasks, getCompletedTasks } = useTaskStore();
  const { currentStreak } = useGamification();

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
    return getCompletedTasks().filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    });
  }, [getCompletedTasks]);

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
        
        {currentStreak > 0 ? (
          <Animated.View entering={FadeInUp.delay(0).duration(400)} style={styles.streakContainer}>
            <StreakBadge streak={currentStreak} compact />
          </Animated.View>
        ) : null}

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

        {completedToday.length > 0 ? (
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <View style={styles.doneTodaySection}>
              <View style={styles.doneTodayHeader}>
                <Feather name="check-circle" size={16} color={LaneColors.later.primary} />
                <ThemedText type="small" style={{ color: LaneColors.later.primary, marginLeft: Spacing.xs }}>
                  Done Today
                </ThemedText>
              </View>
              <View style={[styles.doneTodayCard, { backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText type="h2" style={{ color: LaneColors.later.primary }}>
                  {completedToday.length}
                </ThemedText>
                <ThemedText type="caption" secondary style={{ marginLeft: Spacing.sm }}>
                  task{completedToday.length !== 1 ? "s" : ""} completed
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ) : null}
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
});
