import React, { useState, useRef, useCallback } from "react";
import { StyleSheet, View, TextInput, Pressable, FlatList } from "react-native";
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
import { useTheme } from "@/hooks/useTheme";
import { useTaskStore, Lane, UnsortedTask } from "@/stores/TaskStore";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

type Phase = "capture" | "sort";

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
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);
  
  const { unsortedTasks, addUnsortedTask, sortUnsortedTask, removeUnsortedTask } = useTaskStore();
  
  const [phase, setPhase] = useState<Phase>("capture");
  const [inputValue, setInputValue] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handleVoiceTranscription = useCallback((text: string) => {
    setVoiceError(null);
    const lines = text.split(/[.,!?]\s+/).filter(line => line.trim().length > 0);
    if (lines.length > 1) {
      lines.forEach(line => {
        if (line.trim()) {
          addUnsortedTask(line.trim());
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (text.trim()) {
      addUnsortedTask(text.trim());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      sortUnsortedTask(taskToSort.id, lane);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [unsortedTasks, sortUnsortedTask]);

  React.useEffect(() => {
    if (phase === "sort" && unsortedTasks.length === 0) {
      navigation.goBack();
    }
  }, [phase, unsortedTasks.length, navigation]);

  const handleSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRemoveUnsorted = useCallback((id: string) => {
    removeUnsortedTask(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [removeUnsortedTask]);

  const currentTask = unsortedTasks[0];

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
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInUp.duration(300)} style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            Brain Dump
          </ThemedText>
          <ThemedText type="body" secondary>
            Type fast. Sort later.
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
          <VoiceRecorder
            onTranscriptionComplete={handleVoiceTranscription}
            onError={handleVoiceError}
            compact
          />
          <Pressable
            onPress={handleAddTask}
            disabled={!inputValue.trim()}
            style={[
              styles.addButton,
              { backgroundColor: inputValue.trim() ? LaneColors.now.primary : theme.backgroundSecondary },
            ]}
          >
            <Feather name="plus" size={24} color={inputValue.trim() ? "#FFFFFF" : theme.textSecondary} />
          </Pressable>
        </View>
        {voiceError ? (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.errorContainer}>
            <ThemedText type="small" style={{ color: LaneColors.now.primary }}>
              {voiceError}
            </ThemedText>
          </Animated.View>
        ) : null}

        {unsortedTasks.length > 0 ? (
          <>
            <View style={styles.listHeader}>
              <ThemedText type="h4">
                Captured ({unsortedTasks.length})
              </ThemedText>
            </View>
            <FlatList
              data={unsortedTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Animated.View
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
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
            <Button
              title={`Sort ${unsortedTasks.length} task${unsortedTasks.length > 1 ? "s" : ""}`}
              onPress={handleStartSorting}
              style={styles.sortButton}
            />
          </>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).duration(300)} style={styles.emptyState}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="body" secondary style={styles.emptyText}>
              Start typing to capture your thoughts
            </ThemedText>
          </Animated.View>
        )}
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
});
