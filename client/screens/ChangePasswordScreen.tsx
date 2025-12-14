import React, { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { apiRequest } from "@/lib/query-client";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { userId } = useTaskStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!userId) {
      setError("Not logged in");
      return;
    }

    setIsLoading(true);
    Haptics.selectionAsync();

    try {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        userId,
        currentPassword,
        newPassword,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to change password");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your password has been changed successfully", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setError("Failed to change password");
      setIsLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
      color: theme.text,
    },
  ];

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
            <View style={[styles.iconBadge, { backgroundColor: LaneColors.later.primary }]}>
              <Feather name="lock" size={24} color="#FFFFFF" />
            </View>
          </View>

          <ThemedText type="body" secondary style={styles.description}>
            Enter your current password and choose a new one
          </ThemedText>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              Current Password
            </ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={inputStyle}
                placeholder="Enter current password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setError("");
                }}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Feather
                  name={showCurrentPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              New Password
            </ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={inputStyle}
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setError("");
                }}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
              >
                <Feather
                  name={showNewPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="small" secondary style={styles.label}>
              Confirm New Password
            </ThemedText>
            <View style={styles.inputWrapper}>
              <TextInput
                style={inputStyle}
                placeholder="Confirm new password"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError("");
                }}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Feather
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: LaneColors.later.primary },
              isLoading && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText type="body" style={styles.submitText}>
                Change Password
              </ThemedText>
            )}
          </Pressable>
        </View>
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
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
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
  inputWrapper: {
    position: "relative",
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingRight: 48,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
