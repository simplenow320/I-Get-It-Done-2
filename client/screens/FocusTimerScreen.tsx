import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View, Pressable, AppState } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useSharedValue, withSpring, withSequence } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import TimerRing from "@/components/TimerRing";
import Button from "@/components/Button";
import Confetti from "@/components/Confetti";
import { useTheme } from "@/hooks/useTheme";
import { useTaskStore } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { FocusStackParamList } from "@/navigation/FocusStackNavigator";

type RouteProps = RouteProp<FocusStackParamList, "FocusTimer">;

const PRESETS = [
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "25 min", minutes: 25 },
];

type TimerState = "idle" | "running" | "paused" | "complete";

export default function FocusTimerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { taskId } = route.params;

  const { tasks, addFocusTime, completeTask } = useTaskStore();
  const { recordFocusSession, recordTaskComplete } = useGamification();
  const task = tasks.find((t) => t.id === taskId);

  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [timeRemaining, setTimeRemaining] = useState(selectedMinutes * 60);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [showConfetti, setShowConfetti] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const scale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleSelectPreset = useCallback((minutes: number) => {
    if (timerState === "idle") {
      setSelectedMinutes(minutes);
      setTimeRemaining(minutes * 60);
      Haptics.selectionAsync();
    }
  }, [timerState]);

  // The countdown runs off a wall-clock end time, not tick counting: phones
  // suspend timers when the screen locks, and the session must still finish.
  const endTimeRef = useRef<number>(0);
  const finishedRef = useRef(false);

  const clearTick = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const finishSession = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTick();
    setTimeRemaining(0);
    setTimerState("complete");
    setShowConfetti(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFocusTime(taskId, selectedMinutes);
    recordFocusSession(selectedMinutes);
  };

  const tick = () => {
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setTimeRemaining(remaining);
    if (remaining <= 0) {
      finishSession();
    } else if (remaining === 60 || remaining === 30 || remaining === 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };
  const tickRef = useRef(tick);
  tickRef.current = tick;

  const runFor = (seconds: number) => {
    endTimeRef.current = Date.now() + seconds * 1000;
    clearTick();
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
  };

  // Catch up immediately when the app comes back from the background.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && intervalRef.current) tickRef.current();
    });
    return () => subscription.remove();
  }, []);

  const startTimer = useCallback(() => {
    finishedRef.current = false;
    setTimerState("running");
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeRemaining(selectedMinutes * 60);
    runFor(selectedMinutes * 60);
  }, [selectedMinutes, taskId, addFocusTime, recordFocusSession]);

  const pauseTimer = useCallback(() => {
    clearTick();
    const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setTimeRemaining(remaining);
    setTimerState("paused");
    elapsedRef.current = selectedMinutes * 60 - remaining;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedMinutes]);

  const resumeTimer = useCallback(() => {
    setTimerState("running");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    runFor(timeRemaining);
  }, [timeRemaining]);

  const resetTimer = useCallback(() => {
    // clearTick also nulls the ref, so the foreground catch-up can't finish
    // (and credit) a session that was reset.
    clearTick();
    setTimerState("idle");
    setTimeRemaining(selectedMinutes * 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedMinutes]);

  const handleCompleteTask = useCallback(() => {
    if (task) {
      const hasSubtasks = (task.subtasks?.length || 0) > 0;
      const subtaskCount = task.subtasks?.length || 0;
      
      completeTask(task.id);
      recordTaskComplete(hasSubtasks, subtaskCount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  }, [task, completeTask, recordTaskComplete, navigation]);

  const handleAnotherSprint = useCallback(() => {
    setTimerState("idle");
    setTimeRemaining(selectedMinutes * 60);
  }, [selectedMinutes]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleMainButton = () => {
    scale.value = withSequence(withSpring(0.95), withSpring(1));
    if (timerState === "idle") {
      startTimer();
    } else if (timerState === "running") {
      pauseTimer();
    } else if (timerState === "paused") {
      resumeTimer();
    }
  };

  if (timerState === "complete") {
    return (
      <ThemedView style={styles.container}>
        <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} count={50} />
        <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.completeContainer}>
            <View style={[styles.completeIcon, { backgroundColor: LaneColors.now.primary }]}>
              <Feather name="check" size={48} color="#FFFFFF" />
            </View>
            <ThemedText type="h1" style={styles.completeTitle}>
              You did it!
            </ThemedText>
            <ThemedText type="body" secondary style={styles.completeSubtitle}>
              {selectedMinutes} minutes of focused work (+15 points)
            </ThemedText>
          </Animated.View>

          <View style={styles.completeActions}>
            <Button
              title="Complete Task"
              onPress={handleCompleteTask}
              icon={<Feather name="check-circle" size={20} color="#FFFFFF" />}
            />
            <Button
              title="Another Sprint?"
              onPress={handleAnotherSprint}
              variant="secondary"
              icon={<Feather name="repeat" size={20} color={theme.text} />}
            />
            <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
              <ThemedText type="body" secondary>
                Back to Focus Mode
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
        {task ? (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.taskHeader}>
            <ThemedText type="h4" style={styles.taskLabel}>
              Focusing on
            </ThemedText>
            <ThemedText type="h2" numberOfLines={2} style={styles.taskTitle}>
              {task.title}
            </ThemedText>
          </Animated.View>
        ) : null}

        {timerState === "idle" ? (
          <Animated.View entering={FadeInUp.delay(100).duration(300)} style={styles.presets}>
            {PRESETS.map((preset) => (
              <Pressable
                key={preset.minutes}
                onPress={() => handleSelectPreset(preset.minutes)}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor: selectedMinutes === preset.minutes ? LaneColors.now.primary : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText
                  type="h4"
                  lightColor={selectedMinutes === preset.minutes ? "#FFFFFF" : theme.text}
                  darkColor={selectedMinutes === preset.minutes ? "#FFFFFF" : theme.text}
                >
                  {preset.label}
                </ThemedText>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <View style={styles.timerContainer}>
          <TimerRing
            timeRemaining={timeRemaining}
            totalTime={selectedMinutes * 60}
            size={260}
            strokeWidth={14}
          />
        </View>

        <Animated.View style={[styles.controls, animatedButtonStyle]}>
          <Pressable
            onPress={handleMainButton}
            style={[styles.mainButton, { backgroundColor: LaneColors.now.primary }]}
          >
            <Feather
              name={timerState === "running" ? "pause" : "play"}
              size={32}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>

        {timerState !== "idle" ? (
          <Pressable onPress={resetTimer} style={styles.resetButton}>
            <Feather name="rotate-ccw" size={20} color={theme.textSecondary} />
            <ThemedText type="body" secondary>
              Reset
            </ThemedText>
          </Pressable>
        ) : null}
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
    alignItems: "center",
  },
  taskHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  taskLabel: {
    marginBottom: Spacing.xs,
  },
  taskTitle: {
    textAlign: "center",
  },
  presets: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  presetButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  timerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    marginBottom: Spacing.lg,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  completeContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  completeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  completeTitle: {
    marginBottom: Spacing.sm,
  },
  completeSubtitle: {
    textAlign: "center",
  },
  completeActions: {
    width: "100%",
    gap: Spacing.sm,
  },
  backLink: {
    alignItems: "center",
    padding: Spacing.md,
  },
});
