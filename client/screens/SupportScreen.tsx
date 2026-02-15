import React from "react";
import { StyleSheet, View, Pressable, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as MailComposer from "expo-mail-composer";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

const SUPPORT_EMAIL = "info@simplenow.co";

const SUPPORT_OPTIONS = [
  {
    id: "idea",
    icon: "star" as const,
    title: "Share an Idea",
    subtitle: "Help us build what matters to you",
    subject: "I Get It Done - New Idea",
    color: LaneColors.soon.primary,
  },
  {
    id: "issue",
    icon: "alert-circle" as const,
    title: "Report an Issue",
    subtitle: "Something not working right? Let us know",
    subject: "I Get It Done - Issue Report",
    color: LaneColors.now.primary,
  },
  {
    id: "feedback",
    icon: "message-circle" as const,
    title: "General Feedback",
    subtitle: "We'd love to hear from you",
    subject: "I Get It Done - Feedback",
    color: LaneColors.later.primary,
  },
  {
    id: "hello",
    icon: "heart" as const,
    title: "Just Say Hello",
    subtitle: "Connect with the team",
    subject: "I Get It Done - Hello",
    color: LaneColors.park.primary,
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();

  const handleSupportOption = async (subject: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const body = `\n\n---\nUser: ${user?.email || "Not signed in"}\nPlatform: ${Platform.OS}`;

    const isAvailable = await MailComposer.isAvailableAsync();

    if (isAvailable) {
      await MailComposer.composeAsync({
        recipients: [SUPPORT_EMAIL],
        subject,
        body,
      });
    } else {
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      try {
        await Linking.openURL(mailtoUrl);
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(50).duration(400)} style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            We're Here to Help
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Tap an option below and your email app will open ready to go
          </ThemedText>
        </Animated.View>

        <View style={[styles.optionsGroup, { backgroundColor: theme.backgroundDefault }]}>
          {SUPPORT_OPTIONS.map((option, index) => (
            <React.Fragment key={option.id}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              <Animated.View entering={FadeInUp.delay(100 + index * 50).duration(400)}>
                <Pressable
                  onPress={() => handleSupportOption(option.subject)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
                    <Feather name={option.icon} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.optionContent}>
                    <ThemedText type="body" style={{ fontWeight: "500" }}>
                      {option.title}
                    </ThemedText>
                    <ThemedText type="small" secondary>
                      {option.subtitle}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              </Animated.View>
            </React.Fragment>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <Pressable
            onPress={() => handleSupportOption("I Get It Done - Support")}
            style={[styles.emailCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <Feather name="at-sign" size={20} color={LaneColors.later.primary} />
            <View style={styles.emailContent}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                {SUPPORT_EMAIL}
              </ThemedText>
              <ThemedText type="small" secondary>
                Tap to email us directly
              </ThemedText>
            </View>
            <Feather name="external-link" size={18} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  optionsGroup: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  emailCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  emailContent: {
    flex: 1,
  },
});
