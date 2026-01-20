import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, FlatList, TextInput, Modal, Alert, Share, Clipboard, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Contact, DelegationStatus, TeamMember, TeamInvite } from "@/stores/TaskStore";

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

type TabType = "team" | "contacts";

export default function TeamHubScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { 
    contacts, addContact, deleteContact, getDelegatedTasks, getDelegatedTasksByContact,
    teamMembers, teamInvites, createTeamInvite, acceptTeamInvite, declineTeamInvite,
    cancelSentInvite, resendInvite, regenerateInvite, removeTeamMember, refreshTeamData, delegatedToMeTasks
  } = useTaskStore();

  const [activeTab, setActiveTab] = useState<TabType>("team");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState<TeamInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sentInvitesExpanded, setSentInvitesExpanded] = useState(false);

  useEffect(() => {
    refreshTeamData();
  }, [refreshTeamData]);

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

  const handleRemoveTeamMember = (member: TeamMember) => {
    Alert.alert(
      "Remove Team Member",
      `Remove ${member.nickname} from your team? They will no longer be able to see tasks you delegate to them.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await removeTeamMember(member.id);
          },
        },
      ]
    );
  };

  const handleCreateInvite = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const invite = await createTeamInvite(inviteEmail || undefined);
    setIsLoading(false);
    if (invite) {
      setGeneratedInvite(invite);
      setInviteEmail("");
    } else {
      Alert.alert("Error", "Failed to create invite. Please try again.");
    }
  };

  const handleShareInvite = async () => {
    if (!generatedInvite) return;
    try {
      await Share.share({
        message: `Join my team on I GET IT DONE!\n\nYour invite code: ${generatedInvite.inviteCode}\n\nHow to join:\n1. Download the app: https://www.igetitdone.co\n2. Create your account\n3. Go to Team Hub and tap "Join Team"\n4. Enter the code above\n\nOnce connected, we can share tasks with each other!`,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCopyCode = () => {
    if (!generatedInvite) return;
    if (Platform.OS === "web") {
      navigator.clipboard?.writeText(generatedInvite.inviteCode);
    } else {
      Clipboard.setString(generatedInvite.inviteCode);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied!", "Invite code copied to clipboard");
  };

  const handleAcceptInvite = async (inviteCode: string) => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await acceptTeamInvite(inviteCode);
    setIsLoading(false);
    if (success) {
      Alert.alert("Success!", "You've joined the team.");
    } else {
      Alert.alert("Error", "Invalid or expired invite code.");
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await declineTeamInvite(inviteId);
  };

  const handleCancelSentInvite = (inviteId: string, email: string | undefined) => {
    Alert.alert(
      "Cancel Invite",
      `Cancel the invite to ${email || "this person"}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Invite",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await cancelSentInvite(inviteId);
          },
        },
      ]
    );
  };

  const handleResendInvite = async (inviteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const invite = await resendInvite(inviteId);
    if (invite) {
      try {
        await Share.share({
          message: `Join my team on I GET IT DONE!\n\nYour invite code: ${invite.inviteCode}\n\nHow to join:\n1. Download the app: https://www.igetitdone.co\n2. Create your account\n3. Go to Team Hub and tap "Join Team"\n4. Enter the code above\n\nOnce connected, we can share tasks with each other!`,
        });
      } catch (error) {
        if (Platform.OS === "web") {
          navigator.clipboard?.writeText(invite.inviteCode);
        } else {
          Clipboard.setString(invite.inviteCode);
        }
        Alert.alert("Code Copied", `Invite code: ${invite.inviteCode}`);
      }
    }
  };

  const handleRegenerateInvite = async (inviteId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newInvite = await regenerateInvite(inviteId);
    if (newInvite) {
      Alert.alert("New Code Generated", `New code: ${newInvite.inviteCode}`, [
        { text: "Copy", onPress: () => {
          if (Platform.OS === "web") {
            navigator.clipboard?.writeText(newInvite.inviteCode);
          } else {
            Clipboard.setString(newInvite.inviteCode);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }},
        { text: "OK" }
      ]);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) return;
    const success = await acceptTeamInvite(joinCode.trim().toUpperCase());
    if (success) {
      setShowJoinModal(false);
      setJoinCode("");
      Alert.alert("Success!", "You've joined the team.");
    } else {
      Alert.alert("Error", "Invalid or expired invite code.");
    }
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

  const renderTeamMemberItem = ({ item }: { item: TeamMember }) => {
    return (
      <Pressable 
        style={[styles.contactCard, { backgroundColor: theme.backgroundDefault }]}
        onLongPress={() => handleRemoveTeamMember(item)}
      >
        <View style={[styles.avatar, { backgroundColor: item.color }]}>
          <ThemedText type="h3" lightColor="#FFFFFF" darkColor="#FFFFFF">
            {(item.nickname || item.teammateName || "T").charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.contactInfo}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {item.nickname || item.teammateName}
          </ThemedText>
          {item.teammateEmail ? (
            <ThemedText type="small" secondary>
              {item.teammateEmail}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.linkedBadge, { backgroundColor: "#34C759" + "20" }]}>
          <Feather name="link" size={12} color="#34C759" />
          <ThemedText type="caption" style={{ color: "#34C759", marginLeft: 4 }}>
            Linked
          </ThemedText>
        </View>
      </Pressable>
    );
  };

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

  const renderReceivedInvite = ({ item }: { item: TeamInvite }) => (
    <View style={[styles.inviteCard, { backgroundColor: LaneColors.now.primary + "15" }]}>
      <View style={styles.inviteInfo}>
        <Feather name="mail" size={20} color={LaneColors.now.primary} />
        <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            Team Invite
          </ThemedText>
          <ThemedText type="small" secondary>
            From: {item.inviterName || item.inviterEmail || "Unknown"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <Pressable
          style={[styles.inviteButton, { backgroundColor: "#34C759" }]}
          onPress={() => handleAcceptInvite(item.inviteCode)}
        >
          <Feather name="check" size={16} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={[styles.inviteButton, { backgroundColor: "#FF3B30" }]}
          onPress={() => handleDeclineInvite(item.id)}
        >
          <Feather name="x" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={activeTab === "team" ? (teamMembers as any[]) : (contacts as any[])}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === "team" ? (renderTeamMemberItem as any) : (renderContactItem as any)}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListHeaderComponent={
          <>
            {teamInvites.received.length > 0 ? (
              <View style={styles.invitesSection}>
                <ThemedText type="h3" style={styles.sectionTitle}>
                  Invites Received
                </ThemedText>
                {teamInvites.received.map((invite) => (
                  <View key={invite.id}>
                    {renderReceivedInvite({ item: invite })}
                  </View>
                ))}
              </View>
            ) : null}

            {teamInvites.sent.length > 0 ? (
              <View style={styles.invitesSection}>
                <Pressable 
                  style={styles.invitesSectionHeader}
                  onPress={() => teamInvites.sent.length > 2 && setSentInvitesExpanded(!sentInvitesExpanded)}
                >
                  <ThemedText type="h3" style={styles.sectionTitle}>
                    Invites Sent ({teamInvites.sent.length})
                  </ThemedText>
                  {teamInvites.sent.length > 2 && (
                    <Feather 
                      name={sentInvitesExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme.textSecondary} 
                    />
                  )}
                </Pressable>
                {(teamInvites.sent.length <= 2 || sentInvitesExpanded ? teamInvites.sent : teamInvites.sent.slice(0, 2)).map((invite) => (
                  <View key={invite.id} style={[styles.sentInviteCard, { backgroundColor: theme.backgroundDefault }]}>
                    <View style={styles.sentInviteInfo}>
                      <Feather name="send" size={16} color={LaneColors.later.primary} />
                      <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
                        <ThemedText type="body" style={{ fontWeight: "500" }}>
                          {invite.inviteeEmail || "Anyone with code"}
                        </ThemedText>
                        <ThemedText type="caption" secondary>
                          Code: {invite.inviteCode}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.sentInviteActions}>
                      <Pressable
                        style={[styles.inviteActionButton, { backgroundColor: LaneColors.later.primary + "20" }]}
                        onPress={() => handleResendInvite(invite.id)}
                      >
                        <Feather name="share" size={14} color={LaneColors.later.primary} />
                      </Pressable>
                      <Pressable
                        style={[styles.inviteActionButton, { backgroundColor: LaneColors.soon.primary + "20" }]}
                        onPress={() => handleRegenerateInvite(invite.id)}
                      >
                        <Feather name="refresh-cw" size={14} color={LaneColors.soon.primary} />
                      </Pressable>
                      <Pressable
                        style={[styles.inviteActionButton, { backgroundColor: "#FF3B30" + "20" }]}
                        onPress={() => handleCancelSentInvite(invite.id, invite.inviteeEmail)}
                      >
                        <Feather name="trash-2" size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                  </View>
                ))}
                {teamInvites.sent.length > 2 && !sentInvitesExpanded && (
                  <Pressable 
                    style={styles.showMoreButton}
                    onPress={() => setSentInvitesExpanded(true)}
                  >
                    <ThemedText type="caption" style={{ color: LaneColors.later.primary }}>
                      Show {teamInvites.sent.length - 2} more
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ) : null}

            {delegatedToMeTasks.length > 0 ? (
              <Pressable
                style={[styles.delegatedToMeCard, { backgroundColor: LaneColors.soon.primary + "20" }]}
                onPress={() => navigation.navigate("DelegatedToMe")}
              >
                <View style={styles.delegatedToMeInfo}>
                  <View style={[styles.delegatedIcon, { backgroundColor: LaneColors.soon.primary }]}>
                    <Feather name="inbox" size={20} color="#FFFFFF" />
                  </View>
                  <View>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      Tasks Assigned to You
                    </ThemedText>
                    <ThemedText type="small" secondary>
                      {delegatedToMeTasks.length} task{delegatedToMeTasks.length !== 1 ? "s" : ""} waiting for you
                    </ThemedText>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : null}

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

            <View style={styles.tabRow}>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === "team" && { borderBottomColor: LaneColors.now.primary, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab("team")}
              >
                <ThemedText
                  type="body"
                  style={{
                    fontWeight: activeTab === "team" ? "600" : "400",
                    color: activeTab === "team" ? LaneColors.now.primary : theme.textSecondary,
                  }}
                >
                  Linked Team ({teamMembers.length})
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
                  type="body"
                  style={{
                    fontWeight: activeTab === "contacts" ? "600" : "400",
                    color: activeTab === "contacts" ? LaneColors.now.primary : theme.textSecondary,
                  }}
                >
                  Contacts ({contacts.length})
                </ThemedText>
              </Pressable>
            </View>

            {activeTab === "team" ? (
              <View style={styles.teamActions}>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: LaneColors.now.primary }]}
                  onPress={() => setShowInviteModal(true)}
                >
                  <Feather name="user-plus" size={18} color="#FFFFFF" />
                  <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600", marginLeft: Spacing.xs }}>
                    Invite
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
                  onPress={() => setShowJoinModal(true)}
                >
                  <Feather name="log-in" size={18} color={theme.text} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.xs }}>
                    Join Team
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.teamHeader}>
                <ThemedText type="h3">Contacts</ThemedText>
                <Pressable
                  onPress={() => setShowAddModal(true)}
                  style={[styles.addButton, { backgroundColor: LaneColors.now.primary }]}
                >
                  <Feather name="plus" size={20} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          activeTab === "team" ? (
            <View style={[styles.emptyContacts, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <ThemedText type="h3" style={styles.emptyTitle}>
                No linked team members
              </ThemedText>
              <ThemedText type="body" secondary style={styles.emptyText}>
                Invite team members or join a team to delegate tasks with real-time updates
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.emptyContacts, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="user-plus" size={48} color={theme.textSecondary} />
              <ThemedText type="h3" style={styles.emptyTitle}>
                Add your first contact
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
                  Add Contact
                </ThemedText>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={
          (activeTab === "team" ? teamMembers.length : contacts.length) > 0 ? (
            <ThemedText type="caption" secondary style={styles.hint}>
              Long press to remove
            </ThemedText>
          ) : null
        }
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={styles.modalContent}
            contentContainerStyle={[
              styles.modalScrollContent,
              { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.xl }
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Add Contact</ThemedText>
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
              style={[
                styles.submitButton,
                { backgroundColor: newName.trim() ? LaneColors.now.primary : theme.backgroundSecondary }
              ]}
              onPress={handleAddContact}
              disabled={!newName.trim()}
            >
              <ThemedText 
                type="body" 
                style={{ 
                  color: newName.trim() ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600"
                }}
              >
                Add Contact
              </ThemedText>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={styles.modalContent}
            contentContainerStyle={[
              styles.modalScrollContent,
              { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.xl }
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Invite Team Member</ThemedText>
              <Pressable onPress={() => { setShowInviteModal(false); setGeneratedInvite(null); }} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {!generatedInvite ? (
              <>
                <ThemedText type="body" secondary>
                  Generate an invite code to share with a team member. They can use this code to join your team.
                </ThemedText>
                
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  placeholder="Their email (optional)"
                  placeholderTextColor={theme.textSecondary}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <Pressable
                  style={[styles.submitButton, { backgroundColor: LaneColors.now.primary }]}
                  onPress={handleCreateInvite}
                  disabled={isLoading}
                >
                  <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600" }}>
                    {isLoading ? "Creating..." : "Generate Invite Code"}
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[styles.codeBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="h2" style={{ letterSpacing: 4 }}>
                    {generatedInvite.inviteCode}
                  </ThemedText>
                </View>
                
                <ThemedText type="small" secondary style={{ textAlign: "center" }}>
                  This code expires in 7 days
                </ThemedText>
                
                <View style={styles.shareActions}>
                  <Pressable
                    style={[styles.shareButton, { backgroundColor: LaneColors.now.primary }]}
                    onPress={handleShareInvite}
                  >
                    <Feather name="share" size={18} color="#FFFFFF" />
                    <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ fontWeight: "600", marginLeft: Spacing.xs }}>
                      Share
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.shareButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={handleCopyCode}
                  >
                    <Feather name="copy" size={18} color={theme.text} />
                    <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.xs }}>
                      Copy
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>

      <Modal visible={showJoinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollViewCompat
            style={styles.modalContent}
            contentContainerStyle={[
              styles.modalScrollContent,
              { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.xl }
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h3">Join a Team</ThemedText>
              <Pressable onPress={() => { setShowJoinModal(false); setJoinCode(""); }} hitSlop={8}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ThemedText type="body" secondary>
              Enter the invite code you received from a team member.
            </ThemedText>
            
            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
              placeholder="XXXXXXXX"
              placeholderTextColor={theme.textSecondary}
              value={joinCode}
              onChangeText={(text) => setJoinCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
            
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: joinCode.length === 8 ? LaneColors.now.primary : theme.backgroundSecondary }
              ]}
              onPress={handleJoinWithCode}
              disabled={joinCode.length !== 8}
            >
              <ThemedText 
                type="body" 
                style={{ 
                  color: joinCode.length === 8 ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: "600"
                }}
              >
                Join Team
              </ThemedText>
            </Pressable>
          </KeyboardAwareScrollViewCompat>
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
  invitesSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  invitesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  showMoreButton: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inviteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  inviteActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  inviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sentInviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sentInviteInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  sentInviteActions: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  inviteActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  delegatedToMeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  delegatedToMeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  delegatedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  statsSection: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  statItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyStats: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  tab: {
    paddingVertical: Spacing.sm,
  },
  teamActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
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
    marginLeft: Spacing.md,
  },
  taskCount: {
    alignItems: "center",
  },
  linkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyContacts: {
    alignItems: "center",
    padding: Spacing.xxl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
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
    maxHeight: "80%",
  },
  modalScrollContent: {
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
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    fontSize: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: "600",
  },
  submitButton: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  codeBox: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  shareActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
