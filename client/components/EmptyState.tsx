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
  message: string;
}

const laneIcons: Record<Lane, keyof typeof Feather.glyphMap> = {
  now: "zap",
  soon: "clock",
  later: "calendar",
  park: "archive",
};

export function EmptyState({ lane, title, message }: EmptyStateProps) {
  const { theme } = useTheme();
  const iconColor = lane ? LaneColors[lane].primary : theme.textSecondary;
  const iconName = lane ? laneIcons[lane] : "check-circle";

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Feather name={iconName} size={40} color={iconColor} />
      </View>
      <ThemedText type="h3" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="body" secondary style={styles.message}>
        {message}
      </ThemedText>
    </View>
  );
}

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
