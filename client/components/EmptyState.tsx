import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, LaneColors } from "@/constants/theme";
import { Lane } from "@/stores/TaskStore";

interface EmptyStateProps {
  lane?: Lane;
  title: string;
  description?: string;
  message?: string;
  icon?: keyof typeof Feather.glyphMap;
}

const laneIcons: Record<Lane, keyof typeof Feather.glyphMap> = {
  now: "zap",
  soon: "clock",
  later: "calendar",
  park: "archive",
};

export default function EmptyState({ lane, title, description, message, icon }: EmptyStateProps) {
  const { theme } = useTheme();
  const iconColor = lane ? LaneColors[lane].primary : theme.textSecondary;
  const iconName = icon || (lane ? laneIcons[lane] : "check-circle");
  const displayMessage = description || message;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Feather name={iconName} size={40} color={iconColor} />
      </View>
      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>
      {displayMessage ? (
        <ThemedText type="body" secondary style={styles.message}>
          {displayMessage}
        </ThemedText>
      ) : null}
    </View>
  );
}

export { EmptyState };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl * 2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
  },
});
