import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, LaneColors } from "@/constants/theme";
import { Task, Lane } from "@/stores/TaskStore";

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onPress: () => void;
  onMove?: (newLane: Lane) => void;
}

const springConfig: WithSpringConfig = {
  damping: 20,
  mass: 0.5,
  stiffness: 200,
  overshootClamping: false,
};

const SWIPE_THRESHOLD = 80;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TaskCard({ task, onComplete, onPress, onMove }: TaskCardProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleComplete = () => {
    triggerHaptic();
    onComplete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.max(-120, Math.min(120, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(handleComplete)();
      }
      translateX.value = withSpring(0, springConfig);
    });

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.98, springConfig);
    })
    .onEnd(() => {
      scale.value = withSpring(1, springConfig);
      runOnJS(onPress)();
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  const leftRevealStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? Math.min(translateX.value / SWIPE_THRESHOLD, 1) : 0,
  }));

  const rightRevealStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1) : 0,
  }));

  const laneColor = LaneColors[task.lane].primary;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.revealLeft, { backgroundColor: theme.link }, leftRevealStyle]}>
        <Feather name="arrow-right" size={24} color="#FFFFFF" />
      </Animated.View>
      <Animated.View style={[styles.revealRight, { backgroundColor: theme.success }, rightRevealStyle]}>
        <Feather name="check" size={24} color="#FFFFFF" />
      </Animated.View>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: theme.backgroundDefault },
            cardAnimatedStyle,
          ]}
        >
          <View style={[styles.lanePill, { backgroundColor: laneColor }]} />
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <ThemedText type="h4" numberOfLines={2} style={styles.title}>
                {task.title}
              </ThemedText>
              {task.delegatedToUserId ? (
                <View style={[styles.sharedBadge, { backgroundColor: theme.link + '20' }]}>
                  <Feather name="users" size={12} color={theme.link} />
                  <ThemedText type="small" style={{ color: theme.link, marginLeft: 4 }}>Shared</ThemedText>
                </View>
              ) : null}
            </View>
            {task.notes ? (
              <ThemedText type="small" secondary numberOfLines={1} style={styles.notes}>
                {task.notes}
              </ThemedText>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
    position: "relative",
  },
  revealLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  revealRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  lanePill: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  title: {
    flex: 1,
  },
  sharedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  notes: {
    marginTop: Spacing.xs,
  },
});
