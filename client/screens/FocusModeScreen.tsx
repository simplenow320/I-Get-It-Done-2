import React, { useState, useCallback } from "react";
import { StyleSheet, View, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSpring, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ProgressRing from "@/components/ProgressRing";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import Confetti from "@/components/Confetti";
import { useTheme } from "@/hooks/useTheme";
import { useTaskStore, Task } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { FocusStackParamList } from "@/navigation/FocusStackNavigator";

type NavigationProp = NativeStackNavigationProp<FocusStackParamList, "FocusMode">;

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function FocusModeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { getTasksByLane, completeTask, moveTask, getTaskProgress } = useTaskStore();
  const { recordTaskComplete, recordNowCleared } = useGamification();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const translateX = useSharedValue(0);

  const nowTasks = getTasksByLane("now");
  const safeIndex = Math.min(currentIndex, Math.max(0, nowTasks.length - 1));
  const currentTask = nowTasks[safeIndex];

  const handleComplete = useCallback(() => {
    if (!currentTask) return;
    const hasSubtasks = (currentTask.subtasks?.length || 0) > 0;
    const subtaskCount = currentTask.subtasks?.length || 0;
    
    completeTask(currentTask.id);
    recordTaskComplete(hasSubtasks, subtaskCount);
    
    setShowConfetti(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, nowTasks.length - 2)));
    
    if (nowTasks.length <= 1) {
      recordNowCleared();
    }
  }, [currentTask, completeTask, recordTaskComplete, recordNowCleared, nowTasks.length]);

  const handleDefer = useCallback(() => {
    if (!currentTask) return;
    moveTask(currentTask.id, "soon");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, nowTasks.length - 2)));
  }, [currentTask, moveTask, nowTasks.length]);

  const handleStartTimer = useCallback(() => {
    if (currentTask) {
      navigation.navigate("FocusTimer", { taskId: currentTask.id });
    }
  }, [currentTask, navigation]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(handleComplete)();
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleDefer)();
      }
      translateX.value = withSpring(0, { damping: 15 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / SWIPE_THRESHOLD, 1) : 0,
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(-translateX.value / SWIPE_THRESHOLD, 1) : 0,
  }));

  if (nowTasks.length === 0 || !currentTask) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }]}>
          <EmptyState
            icon="check-circle"
            title="All caught up"
            description="You've completed all your Now tasks. Great work!"
          />
        </View>
      </ThemedView>
    );
  }

  const progress = getTaskProgress(currentTask.id);
  const hasSubtasks = currentTask.subtasks?.length > 0;

  return (
    <ThemedView style={styles.container}>
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} count={40} />
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl }]}>
        <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
          <ThemedText type="h3">Focus Mode</ThemedText>
          <ThemedText type="small" secondary>
            {currentIndex + 1} of {nowTasks.length}
          </ThemedText>
        </Animated.View>

        <View style={styles.swipeContainer}>
          <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, leftIndicatorStyle]}>
            <Feather name="check" size={32} color={LaneColors.now.primary} />
            <ThemedText type="small" style={{ color: LaneColors.now.primary }}>Done</ThemedText>
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.taskCard, { backgroundColor: theme.backgroundDefault }, animatedCardStyle]}>
              {hasSubtasks ? (
                <View style={styles.progressContainer}>
                  <ProgressRing progress={progress} size={60} strokeWidth={6} />
                  <ThemedText type="small" secondary style={styles.progressText}>
                    {progress}% complete
                  </ThemedText>
                </View>
              ) : null}

              <ThemedText type="h1" style={styles.taskTitle}>
                {currentTask.title}
              </ThemedText>

              {currentTask.notes ? (
                <ThemedText type="body" secondary style={styles.taskNotes}>
                  {currentTask.notes}
                </ThemedText>
              ) : null}

              {hasSubtasks ? (
                <View style={styles.subtaskPreview}>
                  <ThemedText type="small" secondary>
                    {currentTask.subtasks?.filter((s) => s.completed).length || 0} of {currentTask.subtasks?.length || 0} subtasks done
                  </ThemedText>
                </View>
              ) : null}

              {currentTask.focusTimeMinutes > 0 ? (
                <View style={styles.focusTimeContainer}>
                  <Feather name="clock" size={14} color={theme.textSecondary} />
                  <ThemedText type="small" secondary>
                    {currentTask.focusTimeMinutes} min focused
                  </ThemedText>
                </View>
              ) : null}
            </Animated.View>
          </GestureDetector>

          <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, rightIndicatorStyle]}>
            <Feather name="clock" size={32} color={LaneColors.soon.primary} />
            <ThemedText type="small" style={{ color: LaneColors.soon.primary }}>Soon</ThemedText>
          </Animated.View>
        </View>

        <View style={styles.swipeHint}>
          <ThemedText type="small" secondary style={styles.hintText}>
            Swipe right to complete, left to defer
          </ThemedText>
        </View>

        <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.actions}>
          <Button
            title="Start Focus Timer"
            onPress={handleStartTimer}
            icon={<Feather name="play" size={20} color="#FFFFFF" />}
          />
        </Animated.View>

        <View style={styles.quickActions}>
          <Pressable
            onPress={handleComplete}
            style={[styles.quickAction, { backgroundColor: LaneColors.now.primary }]}
          >
            <Feather name="check" size={24} color="#FFFFFF" />
            <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF">
              Complete
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDefer}
            style={[styles.quickAction, { backgroundColor: LaneColors.soon.primary }]}
          >
            <Feather name="clock" size={24} color="#FFFFFF" />
            <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF">
              Defer
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  swipeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeIndicator: {
    position: "absolute",
    alignItems: "center",
    gap: Spacing.xs,
  },
  leftIndicator: {
    left: 0,
  },
  rightIndicator: {
    right: 0,
  },
  taskCard: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 280,
    marginHorizontal: Spacing.xl,
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressText: {
    marginTop: Spacing.sm,
  },
  taskTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  taskNotes: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  subtaskPreview: {
    marginTop: Spacing.sm,
  },
  focusTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  swipeHint: {
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  hintText: {
    textAlign: "center",
  },
  actions: {
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
});
