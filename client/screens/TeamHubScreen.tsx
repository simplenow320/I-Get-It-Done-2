import React, { useState } from "react";
import { StyleSheet, View, Pressable, FlatList, TextInput, Modal, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Contact, DelegationStatus } from "@/stores/TaskStore";

const STATUS_LABELS: Record<DelegationStatus, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting: "Waiting",
  needs_review: "Needs Review",
  done: "Done",
};

const STATUS_COLORS: Record<DelegationStatus, string> = {
  assigned: "#007AFF",
  in_progress: "#FF9500",
  waiting: "#AF52DE",
  needs_review: "#FF3B30",
  done: "#34C759",
};

export default function TeamHubScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { contacts, addContact, deleteContact, getDelegatedTasks, getDelegatedTasksByContact } = useTaskStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const delegatedTasks = getDelegatedTasks();

  const handleAddContact = () => {
    if (!newName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addContact(newName.trim(), newRole.trim() || undefined);
    setNewName("");
    setNewRole("");
    setShowAddModal(false);
  };

  const handleDeleteContact = (contact: Contact) => {
    const taskCount = getDelegatedTasksByContact(contact.id).length;
    const message = taskCount > 0 
      ? `${contact.name} has ${taskCount} delegated task${taskCount > 1 ? "s" : ""}. Removing them will unassign these tasks.`
      : `Remove ${contact.name} from your team?`;
    
    Alert.alert("Remove Team Member", message, [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Remove", 
        style: "destructive", 
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteContact(contact.id);
        }
      },
    ]);
  };

  const getStatusSummary = () => {
    const summary: Partial<Record<DelegationStatus, number>> = {};
    delegatedTasks.forEach((task) => {
      if (task.delegationStatus) {
        summary[task.delegationStatus] = (summary[task.delegationStatus] || 0) + 1;
      }
    });
    return summary;
  };

  const statusSummary = getStatusSummary();

  const renderContactItem = ({ item }: { item: Contact }) => {
    const tasks = getDelegatedTasksByContact(item.id);
    return (
      <Pressable 
        style={[styles.contactCard, { backgroundColor: theme.backgroundDefault }]}
        onLongPress={() => handleDeleteContact(item)}
      >
        <View style={[styles.avatar, { backgroundColor: item.color }]}>
          <ThemedText type="h3" lightColor="#FFFFFF" darkColor="#FFFFFF">
            {item.name.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.contactInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {item.name}
          </ThemedText>
          {item.role ? (
            <ThemedText type="small" secondary>
              {item.role}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.taskCount}>
          <ThemedText type="h4" style={{ color: item.color }}>
            {tasks.length}
          </ThemedText>
          <ThemedText type="caption" secondary>
            {tasks.length === 1 ? "task" : "tasks"}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContactItem}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.statsSection}>
              <ThemedText type="h2" style={styles.sectionTitle}>
                Delegation Overview
              </ThemedText>
              {delegatedTasks.length > 0 ? (
                <View style={[styles.statsRow, { backgroundColor: theme.backgroundDefault }]}>
                  {Object.entries(statusSummary).map(([status, count]) => (
                    <View key={status} style={styles.statItem}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status as DelegationStatus] }]} />
                      <ThemedText type="h4">{count}</ThemedText>
                      <ThemedText type="caption" secondary>
                        {STATUS_LABELS[status as DelegationStatus]}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyStats, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name="users" size={32} color={theme.textSecondary} />
                  <ThemedText type="body" secondary style={styles.emptyText}>
                    No delegated tasks yet
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    Delegate tasks from the task detail screen
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.teamHeader}>
              <ThemedText type="h2">Team Members</ThemedText>
              <Pressable
                onPress={() => setShowAddModal(true)}
                style={[styles.addButton, { backgroundColor: LaneColors.now.primary }]}
              >
                <Feather name="plus" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyContacts, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="user-plus" size={48} color={theme.textSecondary} />
            <ThemedText type="h3" style={styles.emptyTitle}>
              Add your first team member
            </ThemedText>
            <ThemedText type="body" secondary style={styles.emptyText}>
              Add people you work with to delegate tasks
            </ThemedText>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={[styles.emptyAddButton, { backgroundColor: LaneColors.now.primary }]}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
                Add Team Member
              </ThemedText>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          contacts.length > 0 ? (
            <ThemedText type="caption" secondary style={styles.hint}>
              Long press to remove a team member
            </ThemedText>
          ) : null
        }
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Add Team Member</ThemedText>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            
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
            
            <Pressable
              onPress={handleAddContact}
              disabled={!newName.trim()}
              style={[
                styles.modalAddButton, 
                { backgroundColor: newName.trim() ? LaneColors.now.primary : theme.backgroundSecondary }
              ]}
            >
              <ThemedText 
                type="body" 
                style={{ fontWeight: "600", color: newName.trim() ? "#FFFFFF" : theme.textSecondary }}
              >
                Add Member
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
  },
  statsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyStats: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.sm,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
  },
  taskCount: {
    alignItems: "center",
  },
  emptyContacts: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  hint: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 34,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    fontSize: 17,
    marginBottom: Spacing.md,
  },
  modalAddButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
});
