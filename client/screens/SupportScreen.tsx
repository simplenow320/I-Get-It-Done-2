import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    Haptics.selectionAsync();

    try {
      const response = await apiRequest("POST", "/api/support/contact", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send message");
        setIsLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setName("");
      setEmail(user?.email || "");
      setMessage("");
    } catch (err) {
      setError("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailDirect = async () => {
    Haptics.selectionAsync();
    try {
      await Linking.openURL("mailto:info@simplenow.co?subject=I Get It Done Support");
    } catch (err) {
      setError("Unable to open email client. Please email info@simplenow.co directly.");
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      color: theme.text,
    },
  ];

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.successContent, { paddingTop: headerHeight + Spacing.xl }]}>
          <View style={[styles.successIconBadge, { backgroundColor: LaneColors.later.primary }]}>
            <Feather name="check" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.successTitle}>
            Message Sent
          </ThemedText>
          <ThemedText type="body" secondary style={styles.successDescription}>
            Thank you for reaching out. We'll get back to you as soon as possible.
          </ThemedText>
          <Pressable
            style={[styles.successButton, { backgroundColor: LaneColors.later.primary }]}
            onPress={() => setSuccess(false)}
          >
            <ThemedText type="body" style={styles.submitText}>
              Send Another Message
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Animated.View entering={FadeInUp.delay(100).duration(400)}>
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconBadge, { backgroundColor: LaneColors.soon.primary }]}>
              <Feather name="mail" size={24} color="#FFFFFF" />
            </View>
          </View>

          <ThemedText type="h3" style={styles.title}>
            Contact Support
          </ThemedText>

          <ThemedText type="body" secondary style={styles.description}>
            Have a question or need help? Send us a message and we'll get back to you.
          </ThemedText>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              Your Name
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Enter your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError("");
              }}
              autoCapitalize="words"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              Email Address
            </ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              Message
            </ThemedText>
            <TextInput
              style={[inputStyle, styles.messageInput]}
              placeholder="How can we help you?"
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                setError("");
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: LaneColors.soon.primary },
              isLoading && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="send" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={styles.submitText}>
                  Send Message
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)}>
        <Pressable
          style={[styles.emailCard, { backgroundColor: theme.backgroundDefault }]}
          onPress={handleEmailDirect}
        >
          <Feather name="at-sign" size={20} color={LaneColors.later.primary} />
          <View style={styles.emailContent}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Email us directly
            </ThemedText>
            <ThemedText type="small" secondary>
              info@simplenow.co
            </ThemedText>
          </View>
          <Feather name="external-link" size={18} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>
    </KeyboardAwareScrollViewCompat>
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
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    alignItems: "center",
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
  inputContainer: {
    gap: Spacing.xs,
  },
  label: {
    marginLeft: Spacing.xs,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  messageInput: {
    height: 120,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emailCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  emailContent: {
    flex: 1,
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  successTitle: {
    textAlign: "center",
  },
  successDescription: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  successButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
