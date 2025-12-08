import React, { useState } from "react";
import { View, StyleSheet, Switch, Platform } from "react-native";
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
import * as Haptics from "expo-haptics";

interface NotificationSettingsProps {
  userId: string;
  onEnabled?: () => void;
}

export function NotificationSettings({ userId, onEnabled }: NotificationSettingsProps) {
  const { theme } = useTheme();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isWeb = Platform.OS === "web";

  const handleToggle = async () => {
    if (isWeb) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    
    try {
      if (!isEnabled) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          const token = await getExpoPushToken();
          if (token && userId) {
            await savePushToken(userId, token);
          }
          setIsEnabled(true);
          onEnabled?.();
        }
      } else {
        setIsEnabled(false);
      }
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
    } finally {
      setIsLoading(false);
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
          disabled={isLoading}
          trackColor={{ false: theme.border, true: LaneColors.now.primary }}
          thumbColor={isEnabled ? "#FFFFFF" : theme.textSecondary}
        />
      </View>
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
});
