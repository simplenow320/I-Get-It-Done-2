import React, { useState } from "react";
import { StyleSheet, View, Pressable, Modal, TextInput, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Task, DelegationNote, DelegationStatus } from "@/stores/TaskStore";

interface DelegationNotesModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

const NOTE_TYPES: { type: DelegationNote["type"]; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { type: "update", label: "Sent Update", icon: "send" },
  { type: "blocked", label: "They're Blocked", icon: "alert-circle" },
  { type: "question", label: "Asked Question", icon: "help-circle" },
  { type: "completed", label: "Task Done", icon: "check-circle" },
  { type: "custom", label: "Custom Note", icon: "edit-3" },
];

const STATUS_OPTIONS: { status: DelegationStatus; label: string; color: string }[] = [
  { status: "assigned", label: "Assigned", color: "#007AFF" },
  { status: "in_progress", label: "In Progress", color: "#FF9500" },
  { status: "waiting", label: "Waiting", color: "#AF52DE" },
  { status: "needs_review", label: "Needs Review", color: "#FF3B30" },
  { status: "done", label: "Done", color: "#34C759" },
];

export default function DelegationNotesModal({ visible, task, onClose }: DelegationNotesModalProps) {
  const { theme } = useTheme();
  const { getContactById, updateDelegationStatus, addDelegationNote } = useTaskStore();

  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedType, setSelectedType] = useState<DelegationNote["type"]>("update");
  const [noteText, setNoteText] = useState("");

  const contact = task.assignedTo ? getContactById(task.assignedTo) : undefined;
  const notes = task.delegationNotes || [];

  const handleStatusChange = (status: DelegationStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateDelegationStatus(task.id, status);
  };

  const handleAddNote = () => {
    if (selectedType !== "custom" || noteText.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const text = selectedType === "custom" ? noteText.trim() : NOTE_TYPES.find(n => n.type === selectedType)?.label || "";
      addDelegationNote(task.id, selectedType, text);
      setNoteText("");
      setShowAddNote(false);
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  const getNoteIcon = (type: DelegationNote["type"]): keyof typeof Feather.glyphMap => {
    return NOTE_TYPES.find(n => n.type === type)?.icon || "message-circle";
  };

  const renderNote = ({ item }: { item: DelegationNote }) => (
    <View style={[styles.noteItem, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={[styles.noteIcon, { backgroundColor: theme.backgroundTertiary }]}>
        <Feather name={getNoteIcon(item.type)} size={16} color={theme.text} />
      </View>
      <View style={styles.noteContent}>
        <ThemedText type="body">{item.text}</ThemedText>
        <ThemedText type="caption" secondary>
          {formatDate(item.createdAt)}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ThemedText type="h3">Delegation Log</ThemedText>
              {contact ? (
                <View style={styles.assigneeRow}>
                  <View style={[styles.miniAvatar, { backgroundColor: contact.color }]}>
                    <ThemedText type="caption" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
                      {contact.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" secondary>
                    Assigned to {contact.name}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.statusSection}>
            <ThemedText type="small" secondary style={styles.label}>
              Status
            </ThemedText>
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map(({ status, label, color }) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusChip,
                    { backgroundColor: task.delegationStatus === status ? color : theme.backgroundSecondary },
                  ]}
                  onPress={() => handleStatusChange(status)}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: task.delegationStatus === status ? "#FFFFFF" : theme.text,
                      fontWeight: task.delegationStatus === status ? "600" : "400",
                    }}
                  >
                    {label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.notesSection}>
            <View style={styles.notesSectionHeader}>
              <ThemedText type="h4">Activity Log</ThemedText>
              <Pressable
                style={[styles.addNoteButton, { backgroundColor: LaneColors.now.primary }]}
                onPress={() => setShowAddNote(true)}
              >
                <Feather name="plus" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {showAddNote ? (
              <View style={[styles.addNoteForm, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.noteTypeRow}>
                  {NOTE_TYPES.map(({ type, label, icon }) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.noteTypeChip,
                        {
                          backgroundColor: selectedType === type ? LaneColors.now.primary : theme.backgroundTertiary,
                        },
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Feather
                        name={icon}
                        size={14}
                        color={selectedType === type ? "#FFFFFF" : theme.text}
                      />
                    </Pressable>
                  ))}
                </View>
                
                {selectedType === "custom" ? (
                  <TextInput
                    style={[styles.noteInput, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                    placeholder="Add a note..."
                    placeholderTextColor={theme.textSecondary}
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                  />
                ) : (
                  <ThemedText type="body" style={styles.presetLabel}>
                    {NOTE_TYPES.find(n => n.type === selectedType)?.label}
                  </ThemedText>
                )}

                <View style={styles.addNoteActions}>
                  <Pressable
                    style={[styles.cancelNoteButton, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => {
                      setShowAddNote(false);
                      setNoteText("");
                    }}
                  >
                    <ThemedText type="small">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.saveNoteButton, { backgroundColor: LaneColors.now.primary }]}
                    onPress={handleAddNote}
                  >
                    <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
                      Add Note
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {notes.length > 0 ? (
              <FlatList
                data={[...notes].reverse()}
                keyExtractor={(item) => item.id}
                renderItem={renderNote}
                style={styles.notesList}
                contentContainerStyle={styles.notesListContent}
              />
            ) : !showAddNote ? (
              <View style={[styles.emptyNotes, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="message-circle" size={24} color={theme.textSecondary} />
                <ThemedText type="small" secondary>
                  No activity logged yet
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 34,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.xs,
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.xs,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  notesSection: {
    flex: 1,
  },
  notesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  addNoteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addNoteForm: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  noteTypeRow: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  noteTypeChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  presetLabel: {
    fontWeight: "500",
  },
  noteInput: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
  },
  addNoteActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cancelNoteButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  saveNoteButton: {
    flex: 2,
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  notesList: {
    maxHeight: 300,
  },
  notesListContent: {
    gap: Spacing.sm,
  },
  noteItem: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  noteContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  emptyNotes: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
});
