import React from "react";
import { StyleSheet, View, Modal, Pressable, Linking, useColorScheme } from "react-native";
import { ThemedText } from "./ThemedText";
import { Feather } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, LaneColors } from "@/constants/theme";

const primaryColor = LaneColors.later.primary;

interface ConsentDisclosureProps {
  visible: boolean;
  type: "microphone" | "notifications";
  onAccept: () => void;
  onDecline: () => void;
}

const disclosureContent = {
  microphone: {
    title: "Microphone Access",
    icon: "mic" as const,
    description: "Voice capture helps you quickly add tasks by speaking instead of typing.",
    dataUsage: [
      "Audio is sent to Deepgram for transcription",
      "Audio is processed immediately and NOT stored",
      "Only the text transcript is saved to your account",
      "Daily usage is limited to 10 minutes",
    ],
    privacyNote: "Your voice recordings are never stored on our servers. Audio is processed in real-time and deleted immediately after transcription.",
  },
  notifications: {
    title: "Push Notifications",
    icon: "bell" as const,
    description: "Get timely reminders to help you stay on track with your tasks.",
    dataUsage: [
      "Your device token is stored to send you notifications",
      "We send task reminders, streak alerts, and achievements",
      "You can customize notification settings anytime",
      "You can turn off notifications in device settings",
    ],
    privacyNote: "We only send notifications you've opted into. Your notification preferences are stored securely.",
  },
};

export function ConsentDisclosure({ visible, type, onAccept, onDecline }: ConsentDisclosureProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const content = disclosureContent[type];

  const openPrivacyPolicy = () => {
    Linking.openURL("/privacy");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.iconContainer}>
            <Feather name={content.icon} size={32} color={primaryColor} />
          </View>
          
          <ThemedText style={styles.title}>{content.title}</ThemedText>
          <ThemedText style={styles.description}>{content.description}</ThemedText>
          
          <View style={[styles.dataSection, isDark && styles.dataSectionDark]}>
            <ThemedText style={styles.dataSectionTitle}>How your data is used:</ThemedText>
            {content.dataUsage.map((item, index) => (
              <View key={index} style={styles.dataItem}>
                <Feather name="check" size={14} color={primaryColor} style={styles.checkIcon} />
                <ThemedText style={styles.dataItemText}>{item}</ThemedText>
              </View>
            ))}
          </View>
          
          <View style={[styles.privacyNote, isDark && styles.privacyNoteDark]}>
            <Feather name="shield" size={14} color={primaryColor} style={styles.shieldIcon} />
            <ThemedText style={styles.privacyNoteText}>{content.privacyNote}</ThemedText>
          </View>
          
          <Pressable onPress={openPrivacyPolicy}>
            <ThemedText style={styles.privacyLink}>Read our Privacy Policy</ThemedText>
          </Pressable>
          
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.declineButton, isDark && styles.declineButtonDark]}
              onPress={onDecline}
            >
              <ThemedText style={styles.declineButtonText}>Not Now</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <ThemedText style={styles.acceptButtonText}>Allow</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
  },
  containerDark: {
    backgroundColor: "#1C1C1E",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(107, 78, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  dataSection: {
    backgroundColor: "#F5F5F7",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dataSectionDark: {
    backgroundColor: "#2C2C2E",
  },
  dataSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    opacity: 0.6,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  checkIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  dataItemText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(107, 78, 255, 0.08)",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  privacyNoteDark: {
    backgroundColor: "rgba(107, 78, 255, 0.15)",
  },
  shieldIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  privacyNoteText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    opacity: 0.8,
  },
  privacyLink: {
    fontSize: 14,
    color: primaryColor,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  declineButton: {
    backgroundColor: "#E5E5EA",
  },
  declineButtonDark: {
    backgroundColor: "#3A3A3C",
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: primaryColor,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
