import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface QuickDumpButtonProps {
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function QuickDumpButton({ onPress }: QuickDumpButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      <LinearGradient
        colors={LaneColors.now.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.iconContainer}>
          <Feather name="zap" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <ThemedText
            type="h4"
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
            style={styles.title}
          >
            Quick Dump
          </ThemedText>
          <ThemedText
            type="small"
            lightColor="rgba(255,255,255,0.8)"
            darkColor="rgba(255,255,255,0.8)"
          >
            Capture ideas fast
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </AnimatedPressable>
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
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
});
