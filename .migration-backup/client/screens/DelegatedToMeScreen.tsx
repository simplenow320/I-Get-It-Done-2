import React, { useCallback, useState } from "react";
import { StyleSheet, View, Pressable, FlatList, Modal, TextInput, RefreshControl, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ProgressRing from "@/components/ProgressRing";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, DelegationStatus, DelegatedToMeTask, RawDelegationNote } from "@/stores/TaskStore";
import { showMessage } from "@/lib/alerts";

const STATUS_OPTIONS: { status: DelegationStatus; label: string; color: string }[] = [
  { status: "assigned", label: "Assigned", color: "#007AFF" },
  { status: "in_progress", label: "In Progress", color: "#FF9500" },
  { status: "waiting", label: "Waiting", color: "#AF52DE" },
  { status: "needs_review", label: "Needs Review", color: "#FF3B30" },
  { status: "done", label: "Done", color: "#34C759" },
];

export default function DelegatedToMeScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { delegatedToMeTasks, refreshDelegatedToMe, updateDelegatedTaskStatus, userId } = useTaskStore();

  const [selectedTask, setSelectedTask] = useState<DelegatedToMeTask | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshDelegatedToMe();
      const interval = setInterval(refreshDelegatedToMe, 30 * 1000);
      return () => clearInterval(interval);
    }, [refreshDelegatedToMe])
  );

  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDelegatedToMe();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = async (status: DelegationStatus) => {
    if (!selectedTask || isSaving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsSaving(true);
    const success = await updateDelegatedTaskStatus(selectedTask.id, status, statusNote.trim() || undefined);
    setIsSaving(false);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowStatusModal(false);
      setSelectedTask(null);
      setStatusNote("");
    } else {
      showMessage("Error", "Failed to update status. Please try again.");
    }
  };

  const noteAuthorName = (note: RawDelegationNote, task: DelegatedToMeTask) =>
    note.authorId && note.authorId === userId ? "You" : task.ownerName;

  const noteTime = (value: string) => {
    const d = new Date(value);
    const sameDay = d.toDateString() === new Date().toDateString();
    return sameDay ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString();
  };

  const openStatusModal = (task: DelegatedToMeTask) => {
    setSelectedTask(task);
    setShowStatusModal(true);
    setStatusNote("");
  };

  const getTaskProgress = (task: DelegatedToMeTask): number => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter((s) => s.completed).length;
    return (completed / task.subtasks.length) * 100;
  };

  const getCurrentStatus = (status?: DelegationStatus) => {
    return STATUS_OPTIONS.find((s) => s.status === status) || STATUS_OPTIONS[0];
  };

  const renderTaskItem = ({ item }: { item: DelegatedToMeTask }) => {
    const currentStatus = getCurrentStatus(item.delegationStatus);
    const progress = getTaskProgress(item);
    const hasSubtasks = item.subtasks && item.subtasks.length > 0;

    return (
      <Pressable
        style={[styles.taskCard, { backgroundColor: theme.backgroundDefault }]}
        onPress={() => openStatusModal(item)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            {hasSubtasks ? (
              <ProgressRing progress={progress} size={32} strokeWidth={3} />
            ) : null}
            <ThemedText type="body" style={[styles.taskTitle, { fontWeight: "600" }]} numberOfLines={2}>
              {item.title}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: currentStatus.color + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: currentStatus.color }]} />
            <ThemedText type="caption" style={{ color: currentStatus.color, fontWeight: "600" }}>
              {currentStatus.label}
            </ThemedText>
          </View>
        </View>

        <View style={styles.taskMeta}>
          <View style={styles.ownerInfo}>
            <Feather name="user" size={14} color={theme.textSecondary} />
            <ThemedText type="small" secondary style={{ marginLeft: Spacing.xs }}>
              From: {item.ownerName}
            </ThemedText>
          </View>
          {item.dueDate ? (
            <View style={styles.dueInfo}>
              <Feather name="clock" size={14} color={theme.textSecondary} />
              <ThemedText type="small" secondary style={{ marginLeft: Spacing.xs }}>
                Due: {new Date(item.dueDate).toLocaleDateString()}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {item.notes ? (
          <ThemedText type="small" secondary numberOfLines={2} style={styles.notes}>
            {item.notes}
          </ThemedText>
        ) : null}

        {item.delegationNotes && item.delegationNotes.length > 0 ? (
          <View style={[styles.latestNote, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="message-circle" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={{ flex: 1 }} numberOfLines={2}>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {noteAuthorName(item.delegationNotes[item.delegationNotes.length - 1], item)}:{" "}
              </ThemedText>
              {item.delegationNotes[item.delegationNotes.length - 1].text || "Update"}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.updateButton, { borderColor: currentStatus.color }]}
            onPress={() => openStatusModal(item)}
          >
            <Feather name="refresh-cw" size={14} color={currentStatus.color} />
            <ThemedText type="small" style={{ color: currentStatus.color, marginLeft: Spacing.xs, fontWeight: "600" }}>
              Update Status
            </ThemedText>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={delegatedToMeTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} />}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="inbox" size={48} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              No tasks assigned to you
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              When team members delegate tasks to you, they will appear here
            </ThemedText>
          </View>
        }
      />

      <Modal visible={showStatusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Update Status</ThemedText>
              <Pressable onPress={() => setShowStatusModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {selectedTask ? (
              <ThemedText type="body" style={styles.modalTaskTitle} numberOfLines={2}>
                {selectedTask.title}
              </ThemedText>
            ) : null}

            {selectedTask?.delegationNotes && selectedTask.delegationNotes.length > 0 ? (
              <ScrollView style={styles.noteThread} contentContainerStyle={{ gap: Spacing.xs }}>
                {selectedTask.delegationNotes.map((note) => (
                  <View key={note.id} style={[styles.threadItem, { backgroundColor: theme.backgroundSecondary }]}>
                    <ThemedText type="caption" secondary>
                      {noteAuthorName(note, selectedTask)} · {noteTime(note.createdAt)}
                    </ThemedText>
                    <ThemedText type="small">{note.text || "Update"}</ThemedText>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.statusOptions}>
              {STATUS_OPTIONS.map((option) => (
                <Pressable
                  key={option.status}
                  style={[
                    styles.statusOption,
                    { 
                      backgroundColor: option.color + "15",
                      borderColor: selectedTask?.delegationStatus === option.status ? option.color : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleStatusChange(option.status)}
                  disabled={isSaving}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: option.color }]} />
                  <ThemedText type="body" style={{ color: option.color, fontWeight: "600" }}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.noteInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="Add a note (optional)"
              placeholderTextColor={theme.textSecondary}
              value={statusNote}
              onChangeText={setStatusNote}
              multiline
            />

            <Pressable
              style={[styles.cancelButton, { borderColor: theme.textSecondary }]}
              onPress={() => setShowStatusModal(false)}
            >
              <ThemedText type="body" secondary>
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  taskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  taskTitle: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  ownerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  notes: {
    marginTop: Spacing.xs,
  },
  latestNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  noteThread: {
    maxHeight: 160,
  },
  threadItem: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 2,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTaskTitle: {
    fontWeight: "500",
  },
  statusOptions: {
    gap: Spacing.sm,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  noteInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minHeight: 80,
    textAlignVertical: "top",
  },
  cancelButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
