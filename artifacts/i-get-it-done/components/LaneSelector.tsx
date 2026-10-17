import React from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, LaneColors } from "@/constants/theme";
import { Lane } from "@/stores/TaskStore";

interface LaneSelectorProps {
  selectedLane: Lane | null;
  onSelectLane: (lane: Lane) => void;
}

const lanes: { lane: Lane; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { lane: "now", label: "Now", icon: "zap" },
  { lane: "soon", label: "Soon", icon: "clock" },
  { lane: "later", label: "Later", icon: "calendar" },
  { lane: "park", label: "Park", icon: "archive" },
];

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function LanePill({
  lane,
  label,
  icon,
  isSelected,
  onSelect,
}: {
  lane: Lane;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const colors = LaneColors[lane];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.pill, animatedStyle]}
    >
      {isSelected ? (
        <LinearGradient
          colors={colors.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pillGradient}
        >
          <Feather name={icon} size={18} color="#FFFFFF" />
          <ThemedText
            style={styles.pillLabel}
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
          >
            {label}
          </ThemedText>
        </LinearGradient>
      ) : (
        <View style={[styles.pillInner, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name={icon} size={18} color={theme.textSecondary} />
          <ThemedText style={styles.pillLabel} secondary>
            {label}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

export function LaneSelector({ selectedLane, onSelectLane }: LaneSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {lanes.map(({ lane, label, icon }) => (
        <LanePill
          key={lane}
          lane={lane}
          label={label}
          icon={icon}
          isSelected={selectedLane === lane}
          onSelect={() => onSelectLane(lane)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  pill: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  pillGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  pillLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
