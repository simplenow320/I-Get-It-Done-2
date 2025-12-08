import React, { useState } from "react";
import { StyleSheet, View, Pressable, Modal, TextInput, FlatList } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Contact, Task } from "@/stores/TaskStore";

interface DelegateTaskModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

export default function DelegateTaskModal({ visible, task, onClose }: DelegateTaskModalProps) {
  const { theme } = useTheme();
  const { contacts, addContact, delegateTask } = useTaskStore();
  
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const handleSelectContact = (contact: Contact) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    delegateTask(task.id, contact.id);
    onClose();
  };

  const handleAddContact = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newContact = addContact(newName.trim(), newRole.trim() || undefined);
    delegateTask(task.id, newContact.id);
    setNewName("");
    setNewRole("");
    setShowAddNew(false);
    onClose();
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <Pressable
      style={[styles.contactItem, { backgroundColor: theme.backgroundSecondary }]}
      onPress={() => handleSelectContact(item)}
    >
      <View style={[styles.avatar, { backgroundColor: item.color }]}>
        <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
          {item.name.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.contactInfo}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {item.name}
        </ThemedText>
        {item.role ? (
          <ThemedText type="small" secondary>
            {item.role}
          </ThemedText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText type="h3">Delegate Task</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.taskPreview, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="small" secondary>
              Task to delegate:
            </ThemedText>
            <ThemedText type="body" numberOfLines={2}>
              {task.title}
            </ThemedText>
          </View>

          {!showAddNew ? (
            <>
              {contacts.length > 0 ? (
                <FlatList
                  data={contacts}
                  keyExtractor={(item) => item.id}
                  renderItem={renderContact}
                  style={styles.contactList}
                  contentContainerStyle={styles.contactListContent}
                />
              ) : null}

              <Pressable
                style={[styles.addNewButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => setShowAddNew(true)}
              >
                <View style={[styles.addIcon, { backgroundColor: LaneColors.now.primary }]}>
                  <Feather name="user-plus" size={18} color="#FFFFFF" />
                </View>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  Add new team member
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <View style={styles.addForm}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="Name"
                placeholderTextColor={theme.textSecondary}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                placeholder="Role (optional)"
                placeholderTextColor={theme.textSecondary}
                value={newRole}
                onChangeText={setNewRole}
              />
              <View style={styles.formButtons}>
                <Pressable
                  style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => {
                    setShowAddNew(false);
                    setNewName("");
                    setNewRole("");
                  }}
                >
                  <ThemedText type="body">Cancel</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.addButton,
                    { backgroundColor: newName.trim() ? LaneColors.now.primary : theme.backgroundSecondary },
                  ]}
                  onPress={handleAddContact}
                  disabled={!newName.trim()}
                >
                  <ThemedText
                    type="body"
                    style={{ fontWeight: "600", color: newName.trim() ? "#FFFFFF" : theme.textSecondary }}
                  >
                    Add & Delegate
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          )}
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
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  taskPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  contactList: {
    maxHeight: 250,
  },
  contactListContent: {
    gap: Spacing.sm,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  addIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addForm: {
    gap: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 17,
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  addButton: {
    flex: 2,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
