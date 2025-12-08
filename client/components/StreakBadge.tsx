import React from "react";
import { StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
}

export default function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  if (streak === 0 && compact) {
    return null;
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <LinearGradient
          colors={[LaneColors.soon.primary, LaneColors.now.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <Feather name="zap" size={12} color="#FFFFFF" />
          <ThemedText
            type="small"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={styles.compactText}
          >
            {streak}
          </ThemedText>
        </LinearGradient>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[LaneColors.soon.primary, LaneColors.now.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.iconContainer}>
        <Feather name="zap" size={20} color="#FFFFFF" />
      </View>
      <View style={styles.textContainer}>
        <ThemedText
          type="heroNumber"
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
          style={styles.streakNumber}
        >
          {streak}
        </ThemedText>
        <ThemedText
          type="small"
          lightColor="rgba(255,255,255,0.8)"
          darkColor="rgba(255,255,255,0.8)"
        >
          day streak
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "flex-start",
  },
  streakNumber: {
    fontSize: 32,
    lineHeight: 36,
  },
  compactContainer: {
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
  compactGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  compactText: {
    fontWeight: "700",
  },
});
