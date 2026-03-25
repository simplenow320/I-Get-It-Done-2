import React, { useState, useRef, useCallback, useMemo } from "react";
import { StyleSheet, View, TextInput, Pressable, ScrollView, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Button from "@/components/Button";
import VoiceRecorder from "@/components/VoiceRecorder";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useTaskStore, Lane, UnsortedTask } from "@/stores/TaskStore";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

type Phase = "capture" | "sort" | "done";

interface SortedTaskRecord {
  taskId: string;
  title: string;
  lane: Lane;
}

const LANE_OPTIONS: { lane: Lane; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { lane: "now", label: "Now", icon: "zap", color: LaneColors.now.primary },
  { lane: "soon", label: "Soon", icon: "clock", color: LaneColors.soon.primary },
  { lane: "later", label: "Later", icon: "calendar", color: LaneColors.later.primary },
  { lane: "park", label: "Park", icon: "archive", color: LaneColors.park.primary },
];

export default function QuickDumpScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);
  
  const { hasProFeatures, freeTrialActive, freeTasksRemaining, lifetimeTasksCreated } = useSubscription();
  const { unsortedTasks, addUnsortedTask, sortUnsortedTask, removeUnsortedTask } = useTaskStore();
  
  const [phase, setPhase] = useState<Phase>("capture");
  const [inputValue, setInputValue] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [sortedTasks, setSortedTasks] = useState<SortedTaskRecord[]>([]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleVoiceTranscription = useCallback(async (text: string) => {
    setVoiceError(null);
    
    if (!text.trim()) return;
    
    setIsExtracting(true);
    
    try {
      const response = await apiRequest("POST", "/api/tasks/extract", { transcript: text });
      const data = await response.json();
      const tasks = data.tasks || [];

      if (tasks.length > 0) {
        tasks.forEach((task: { title: string }) => {
          addUnsortedTask(task.title);
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Task extraction error:", error);
    } finally {
      setIsExtracting(false);
    }
  }, [addUnsortedTask]);

  const handleVoiceError = useCallback((error: string) => {
    setVoiceError(error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const handleAddTask = useCallback(() => {
    if (inputValue.trim()) {
      addUnsortedTask(inputValue.trim());
      setInputValue("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setVoiceError("Type something first, or tap the mic to speak");
      setTimeout(() => setVoiceError(null), 2000);
    }
  }, [inputValue, addUnsortedTask]);

  const handleStartSorting = useCallback(() => {
    if (unsortedTasks.length > 0) {
      setPhase("sort");
    }
  }, [unsortedTasks.length]);

  const handleSortTask = useCallback((lane: Lane) => {
    const taskToSort = unsortedTasks[0];
    if (taskToSort) {
      const createdId = sortUnsortedTask(taskToSort.id, lane);
      if (createdId) {
        setSortedTasks((prev) => [...prev, { taskId: createdId, title: taskToSort.title, lane }]);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [unsortedTasks, sortUnsortedTask]);

  React.useEffect(() => {
    if (phase === "sort" && unsortedTasks.length === 0 && sortedTasks.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase("done");
    }
  }, [phase, unsortedTasks.length, sortedTasks.length]);

  const handleSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRemoveUnsorted = useCallback((id: string) => {
    removeUnsortedTask(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [removeUnsortedTask]);

  const currentTask = unsortedTasks[0];

  const nowTaskFromSorted = useMemo(() => {
    const nowSorted = sortedTasks.filter((t) => t.lane === "now");
    if (nowSorted.length > 0) return nowSorted[0];
    const soonSorted = sortedTasks.filter((t) => t.lane === "soon");
    if (soonSorted.length > 0) return soonSorted[0];
    return sortedTasks[0] || null;
  }, [sortedTasks]);

  if (phase === "done" && sortedTasks.length > 0) {
    const laneLabel = (lane: Lane) => LANE_OPTIONS.find((o) => o.lane === lane);
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.doneHeader}>
            <View style={[styles.doneCheckCircle, { backgroundColor: LaneColors.later.primary + "20" }]}>
              <Feather name="check" size={32} color={LaneColors.later.primary} />
            </View>
            <ThemedText type="h2" style={styles.doneTitle}>
              That's {sortedTasks.length} fewer thing{sortedTasks.length > 1 ? "s" : ""} in your head
            </ThemedText>
            <ThemedText type="body" secondary>
              All sorted and ready to go.
            </ThemedText>
          </Animated.View>

          <ScrollView style={styles.doneList} showsVerticalScrollIndicator={false}>
            {sortedTasks.map((item, index) => {
              const laneInfo = laneLabel(item.lane);
              return (
                <Animated.View
                  key={index}
                  entering={FadeInUp.delay(100 + index * 50).duration(300)}
                  style={[styles.doneTaskRow, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={[styles.doneLaneDot, { backgroundColor: laneInfo?.color || theme.textSecondary }]} />
                  <ThemedText type="body" style={{ flex: 1 }} numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="caption" style={{ color: laneInfo?.color || theme.textSecondary }}>
                    {laneInfo?.label}
                  </ThemedText>
                </Animated.View>
              );
            })}
          </ScrollView>

          {nowTaskFromSorted ? (
            <Animated.View entering={FadeInUp.delay(300).duration(400)}>
              <Pressable
                onPress={() => {
                  navigation.goBack();
                  setTimeout(() => {
                    (navigation as any).navigate("TaskDetail", { taskId: nowTaskFromSorted.taskId });
                  }, 100);
                }}
                style={[styles.startHereButton, { backgroundColor: LaneColors[nowTaskFromSorted.lane].primary }]}
              >
                <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
                  Start here
                </ThemedText>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </Pressable>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInUp.delay(400).duration(300)}>
            <Pressable onPress={() => navigation.goBack()} style={styles.doneBackButton}>
              <ThemedText type="body" secondary>
                Back to dashboard
              </ThemedText>
            </Pressable>
          </Animated.View>
        </View>
      </ThemedView>
    );
  }

  if (phase === "sort" && currentTask && unsortedTasks.length > 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
          <Animated.View entering={FadeInUp.duration(300)} style={styles.sortHeader}>
            <ThemedText type="h3" style={styles.sortTitle}>
              Where does this go?
            </ThemedText>
            <ThemedText type="small" secondary>
              {unsortedTasks.length} remaining
            </ThemedText>
          </Animated.View>

          <Animated.View
            key={currentTask.id}
            entering={FadeInRight.duration(300)}
            exiting={FadeOutLeft.duration(200)}
            style={[styles.taskPreview, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="h2" style={styles.taskTitle}>
              {currentTask.title}
            </ThemedText>
          </Animated.View>

          <View style={styles.laneOptions}>
            {LANE_OPTIONS.map((option, index) => (
              <Animated.View
                key={option.lane}
                entering={FadeInUp.delay(index * 50).duration(200)}
              >
                <Pressable
                  onPress={() => handleSortTask(option.lane)}
                  style={({ pressed }) => [
                    styles.laneOption,
                    { backgroundColor: option.color, opacity: pressed ? 0.9 : 1 },
                  ]}
                >
                  <Feather name={option.icon} size={24} color="#FFFFFF" />
                  <ThemedText
                    type="h4"
                    lightColor="#FFFFFF"
                    darkColor="#FFFFFF"
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            ))}
          </View>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <ThemedText type="body" secondary>
              Skip for now
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            Brain Dump
          </ThemedText>
          <ThemedText type="body" secondary>
            Say it or type it. Sort later.
          </ThemedText>
        </Animated.View>

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            ref={inputRef}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="What's on your mind?"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAddTask}
            blurOnSubmit={false}
          />
          {hasProFeatures ? (
            <VoiceRecorder
              onTranscriptionComplete={handleVoiceTranscription}
              onError={handleVoiceError}
              compact
              userId={user?.id}
            />
          ) : (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                (navigation as any).navigate("ProfileTab", { screen: "Subscription" });
              }}
              style={({ pressed }) => [
                {
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: theme.backgroundSecondary,
                  alignItems: "center" as const, justifyContent: "center" as const,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="lock" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={handleAddTask}
            style={({ pressed }) => [
              styles.addButton,
              { 
                backgroundColor: inputValue.trim() ? LaneColors.now.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="plus" size={24} color={inputValue.trim() ? "#FFFFFF" : theme.textSecondary} />
          </Pressable>
        </View>
        {isExtracting ? (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.extractingContainer}>
            <Feather name="loader" size={16} color={theme.textSecondary} />
            <ThemedText type="small" secondary>
              Extracting tasks...
            </ThemedText>
          </Animated.View>
        ) : null}
        {voiceError ? (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.errorContainer}>
            <ThemedText type="small" style={{ color: LaneColors.now.primary }}>
              {voiceError}
            </ThemedText>
          </Animated.View>
        ) : null}

        {unsortedTasks.length > 0 ? (
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View>
              <View style={styles.listHeader}>
                <ThemedText type="h4">
                  Captured ({unsortedTasks.length})
                </ThemedText>
              </View>
              <View style={styles.listContent}>
                {unsortedTasks.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInUp.delay(index * 30).duration(200)}
                    style={[styles.capturedItem, { backgroundColor: theme.backgroundDefault }]}
                  >
                    <ThemedText type="body" style={styles.capturedTitle}>
                      {item.title}
                    </ThemedText>
                    <Pressable onPress={() => handleRemoveUnsorted(item.id)} hitSlop={8}>
                      <Feather name="x" size={18} color={theme.textSecondary} />
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
              <Button
                title={`Sort ${unsortedTasks.length} task${unsortedTasks.length > 1 ? "s" : ""}`}
                onPress={handleStartSorting}
                style={styles.sortButton}
              />
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.emptyState}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="body" secondary style={styles.emptyText}>
              Tap the mic or start typing
            </ThemedText>
          </Animated.View>
        )}
      </KeyboardAwareScrollViewCompat>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.sm,
  },
  capturedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  capturedTitle: {
    flex: 1,
  },
  sortButton: {
    marginTop: Spacing.md,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
  sortHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  sortTitle: {
    marginBottom: Spacing.xs,
  },
  taskPreview: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    marginBottom: Spacing.xl,
  },
  taskTitle: {
    textAlign: "center",
  },
  laneOptions: {
    gap: Spacing.sm,
  },
  laneOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  skipButton: {
    alignItems: "center",
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  extractingContainer: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  doneHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  doneCheckCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  doneTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  doneList: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  doneTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  doneLaneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  startHereButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  doneBackButton: {
    alignItems: "center",
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
});
