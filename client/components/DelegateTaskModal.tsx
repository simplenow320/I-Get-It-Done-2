import React, { useState } from "react";
import { StyleSheet, View, Pressable, Modal, TextInput, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Contact, Task, TeamMember } from "@/stores/TaskStore";

interface DelegateTaskModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
}

type TabType = "team" | "contacts";

export default function DelegateTaskModal({ visible, task, onClose }: DelegateTaskModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { contacts, teamMembers, addContact, delegateTask, delegateTaskToUser } = useTaskStore();
  
  const [activeTab, setActiveTab] = useState<TabType>(teamMembers.length > 0 ? "team" : "contacts");
  const [showAddNew, setShowAddNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");

  const handleSelectTeamMember = (member: TeamMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    delegateTaskToUser(task.id, member.teammateId);
    onClose();
  };

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

  const renderTeamMember = ({ item }: { item: TeamMember }) => (
    <Pressable
      style={[styles.contactItem, { backgroundColor: theme.backgroundSecondary }]}
      onPress={() => handleSelectTeamMember(item)}
    >
      <View style={[styles.avatar, { backgroundColor: item.color }]}>
        <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
          {(item.nickname || item.teammateName || "T").charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.contactInfo}>
        <ThemedText type="body" style={{ fontWeight: "500" }}>
          {item.nickname || item.teammateName}
        </ThemedText>
        {item.teammateEmail ? (
          <ThemedText type="small" secondary>
            {item.teammateEmail}
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.linkedBadge, { backgroundColor: "#34C759" + "20" }]}>
        <Feather name="link" size={10} color="#34C759" />
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

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

  const hasTeamMembers = teamMembers.length > 0;
  const hasContacts = contacts.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <Pressable style={styles.overlayTouchable} onPress={onClose} />
        <View style={[styles.content, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.lg }]}>
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

            {(hasTeamMembers || hasContacts) ? (
              <View style={styles.tabRow}>
                <Pressable
                  style={[
                    styles.tab,
                    activeTab === "team" && { borderBottomColor: LaneColors.now.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setActiveTab("team")}
                >
                  <ThemedText
                    type="small"
                    style={{
                      fontWeight: activeTab === "team" ? "600" : "400",
                      color: activeTab === "team" ? LaneColors.now.primary : theme.textSecondary,
                    }}
                  >
                    Team ({teamMembers.length})
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.tab,
                    activeTab === "contacts" && { borderBottomColor: LaneColors.now.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setActiveTab("contacts")}
                >
                  <ThemedText
                    type="small"
                    style={{
                      fontWeight: activeTab === "contacts" ? "600" : "400",
                      color: activeTab === "contacts" ? LaneColors.now.primary : theme.textSecondary,
                    }}
                  >
                    Contacts ({contacts.length})
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {!showAddNew ? (
              <>
                {activeTab === "team" && hasTeamMembers ? (
                  <>
                    <View style={styles.teamBenefit}>
                      <Feather name="zap" size={14} color="#34C759" />
                      <ThemedText type="caption" style={{ color: "#34C759", marginLeft: Spacing.xs }}>
                        Linked team members can update task status in real-time
                      </ThemedText>
                    </View>
                    <FlatList
                      data={teamMembers}
                      keyExtractor={(item) => item.id}
                      renderItem={renderTeamMember}
                      style={styles.contactList}
                      contentContainerStyle={styles.contactListContent}
                      scrollEnabled={false}
                    />
                  </>
                ) : activeTab === "team" && !hasTeamMembers ? (
                  <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="users" size={32} color={theme.textSecondary} />
                    <ThemedText type="body" secondary style={{ textAlign: "center" }}>
                      No linked team members yet
                    </ThemedText>
                    <ThemedText type="small" secondary style={{ textAlign: "center" }}>
                      Invite team members from the Team Hub to delegate with real-time updates
                    </ThemedText>
                  </View>
                ) : null}

                {activeTab === "contacts" && hasContacts ? (
                  <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderContact}
                    style={styles.contactList}
                    contentContainerStyle={styles.contactListContent}
                    scrollEnabled={false}
                  />
                ) : activeTab === "contacts" && !hasContacts ? (
                  <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="user-plus" size={32} color={theme.textSecondary} />
                    <ThemedText type="body" secondary style={{ textAlign: "center" }}>
                      No contacts yet
                    </ThemedText>
                  </View>
                ) : null}

                {activeTab === "contacts" ? (
                  <Pressable
                    style={[styles.addNewButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setShowAddNew(true)}
                  >
                    <View style={[styles.addIcon, { backgroundColor: LaneColors.now.primary }]}>
                      <Feather name="user-plus" size={18} color="#FFFFFF" />
                    </View>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      Add new contact
                    </ThemedText>
                  </Pressable>
                ) : null}
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
                <View style={styles.addFormButtons}>
                  <Pressable
                    style={[styles.cancelButton, { borderColor: theme.textSecondary }]}
                    onPress={() => {
                      setShowAddNew(false);
                      setNewName("");
                      setNewRole("");
                    }}
                  >
                    <ThemedText type="body" secondary>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.submitButton,
                      { backgroundColor: newName.trim() ? LaneColors.now.primary : theme.backgroundSecondary }
                    ]}
                    onPress={handleAddContact}
                    disabled={!newName.trim()}
                  >
                    <ThemedText 
                      type="body" 
                      style={{ color: newName.trim() ? "#FFFFFF" : theme.textSecondary, fontWeight: "600" }}
                    >
                      Add & Delegate
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },
  content: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  tab: {
    paddingVertical: Spacing.sm,
  },
  teamBenefit: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  contactList: {
    maxHeight: 240,
  },
  contactListContent: {
    gap: Spacing.sm,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
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
  linkedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  addIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addForm: {
    gap: Spacing.md,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  addFormButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  submitButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
