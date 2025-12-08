import React, { useState, useCallback } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";

type RouteParams = {
  TaskDetail: { taskId: string };
};

const lanes: { lane: Lane; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { lane: "now", label: "Now", icon: "zap" },
  { lane: "soon", label: "Soon", icon: "clock" },
  { lane: "later", label: "Later", icon: "calendar" },
  { lane: "park", label: "Park", icon: "archive" },
];

export default function TaskDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "TaskDetail">>();
  const { tasks, updateTask, deleteTask, moveTask, completeTask } = useTaskStore();

  const task = tasks.find((t) => t.id === route.params.taskId);

  const [title, setTitle] = useState(task?.title || "");
  const [notes, setNotes] = useState(task?.notes || "");

  const handleSave = () => {
    if (!task) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateTask(task.id, { title: title.trim(), notes: notes.trim() || undefined });
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleMove = useCallback((newLane: Lane) => {
    if (!task || task.lane === newLane) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    moveTask(task.id, newLane);
  }, [task, moveTask]);

  const handleComplete = () => {
    if (!task) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(task.id);
    navigation.goBack();
  };

  const handleDelete = () => {
    if (!task) return;
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteTask(task.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (!task) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Task not found</ThemedText>
      </ThemedView>
    );
  }

  const hasChanges = title.trim() !== task.title || (notes.trim() || undefined) !== task.notes;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleClose} hitSlop={8}>
          <ThemedText type="body" style={{ color: theme.link }}>
            Close
          </ThemedText>
        </Pressable>
        <ThemedText type="h4">Task Details</ThemedText>
        <Pressable onPress={handleSave} disabled={!hasChanges} hitSlop={8}>
          <ThemedText
            type="body"
            style={{
              color: hasChanges ? theme.link : theme.textSecondary,
              fontWeight: "600",
            }}
          >
            Save
          </ThemedText>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="Task title"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            multiline
            maxLength={200}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            style={[styles.notesInput, { color: theme.text }]}
            placeholder="Add notes"
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Move to
          </ThemedText>
          <View style={styles.lanesRow}>
            {lanes.filter((l) => l.lane !== task.lane).map(({ lane, label, icon }) => (
              <Pressable
                key={lane}
                onPress={() => handleMove(lane)}
                style={[styles.laneButton, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneIconSmall, { backgroundColor: LaneColors[lane].primary }]}>
                  <Feather name={icon} size={16} color="#FFFFFF" />
                </View>
                <ThemedText type="small" style={{ fontWeight: "500" }}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Actions
          </ThemedText>
          <Pressable
            onPress={handleComplete}
            style={[styles.actionButton, { backgroundColor: theme.success }]}
          >
            <Feather name="check" size={20} color="#FFFFFF" />
            <ThemedText
              type="body"
              style={{ fontWeight: "600" }}
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
            >
              Mark Complete
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: theme.error }]}
          >
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <ThemedText
              type="body"
              style={{ fontWeight: "600" }}
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
            >
              Delete Task
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  inputContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "500",
    minHeight: 60,
    textAlignVertical: "top",
  },
  notesInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  lanesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  laneButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  laneIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
});
