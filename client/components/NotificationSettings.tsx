import React, { useState, useEffect } from "react";
import { View, StyleSheet, Switch, Platform, ActivityIndicator, Pressable } from "react-native";
import { ThemedText } from "./ThemedText";
import { Card } from "./Card";
import { LaneColors, Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import {
  requestNotificationPermissions,
  getExpoPushToken,
  savePushToken,
} from "@/lib/notifications";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { getStoredAuthToken } from "@/contexts/AuthContext";
import * as Haptics from "expo-haptics";

interface NotificationSettingsProps {
  userId: string;
  onEnabled?: () => void;
}

export function NotificationSettings({ userId, onEnabled }: NotificationSettingsProps) {
  const { theme } = useTheme();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (!userId || isWeb) {
      setIsLoading(false);
      return;
    }
    loadNotificationState();
  }, [userId]);

  const loadNotificationState = async () => {
    try {
      const token = await getStoredAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const response = await fetch(
        new URL(`/api/users/${userId}/notification-settings`, getApiUrl()).toString(),
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        setIsEnabled(data.notificationsEnabled && data.hasPushToken);
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    if (isWeb) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsToggling(true);

    try {
      if (!isEnabled) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          const token = await getExpoPushToken();
          if (token && userId) {
            await savePushToken(userId, token, true);
          } else {
            await apiRequest("PUT", `/api/users/${userId}/push-token`, {
              notificationsEnabled: true,
            });
          }
          setIsEnabled(true);
          onEnabled?.();
        }
      } else {
        await apiRequest("PUT", `/api/users/${userId}/push-token`, {
          notificationsEnabled: false,
        });
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiRequest("POST", "/api/notifications/test");
    } catch (error) {
      console.error("Failed to send test notification:", error);
    }
  };

  if (isWeb) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Feather name="bell" size={24} color={theme.textSecondary} />
          </View>
          <View style={styles.textContainer}>
            <ThemedText style={styles.title}>Push Notifications</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Run in Expo Go to enable notifications
            </ThemedText>
          </View>
          <Switch
            value={false}
            disabled={true}
            trackColor={{ false: theme.border, true: LaneColors.now.primary }}
            thumbColor={theme.textSecondary}
          />
        </View>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <View style={[styles.row, { justifyContent: "center" }]}>
          <ActivityIndicator size="small" color={LaneColors.now.primary} />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconContainer, isEnabled && styles.iconEnabled]}>
          <Feather
            name={isEnabled ? "bell" : "bell-off"}
            size={24}
            color={isEnabled ? LaneColors.now.primary : theme.textSecondary}
          />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>Push Notifications</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isEnabled
              ? "Get reminders for overdue tasks"
              : "Enable to never miss a task"}
          </ThemedText>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          disabled={isToggling}
          trackColor={{ false: theme.border, true: LaneColors.now.primary }}
          thumbColor={isEnabled ? "#FFFFFF" : theme.textSecondary}
        />
      </View>
      {isEnabled ? (
        <Pressable
          style={[styles.testButton, { borderTopColor: theme.border }]}
          onPress={handleTestNotification}
        >
          <Feather name="send" size={16} color={LaneColors.now.primary} />
          <ThemedText style={[styles.testButtonText, { color: LaneColors.now.primary }]}>
            Send Test Notification
          </ThemedText>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  iconEnabled: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
