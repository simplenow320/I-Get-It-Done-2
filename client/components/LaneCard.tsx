import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing, LaneColors, Typography } from "@/constants/theme";
import { Lane } from "@/stores/TaskStore";

interface LaneCardProps {
  lane: Lane;
  count: number;
  onPress: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const laneConfig: Record<Lane, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  now: { label: "Now", icon: "zap" },
  soon: { label: "Soon", icon: "clock" },
  later: { label: "Later", icon: "calendar" },
  park: { label: "Park", icon: "archive" },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function LaneCard({ lane, count, onPress }: LaneCardProps) {
  const scale = useSharedValue(1);
  const config = laneConfig[lane];
  const colors = LaneColors[lane];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.container, animatedStyle]}
    >
      <LinearGradient
        colors={colors.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Feather name={config.icon} size={24} color="rgba(255,255,255,0.9)" />
        </View>
        <ThemedText
          style={styles.count}
          lightColor="#FFFFFF"
          darkColor="#FFFFFF"
        >
          {count}
        </ThemedText>
        <ThemedText
          style={styles.label}
          lightColor="rgba(255,255,255,0.9)"
          darkColor="rgba(255,255,255,0.9)"
        >
          {config.label}
        </ThemedText>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1.1,
  },
  gradient: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  count: {
    ...Typography.hero,
    color: "#FFFFFF",
  },
  label: {
    ...Typography.h4,
    color: "rgba(255,255,255,0.9)",
  },
});
