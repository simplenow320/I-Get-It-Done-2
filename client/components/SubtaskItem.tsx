import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInRight, FadeOutLeft, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { Subtask } from "@/stores/TaskStore";

interface SubtaskItemProps {
  subtask: Subtask;
  color?: string;
  onToggle: () => void;
  onDelete: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SubtaskItem({ subtask, color, onToggle, onDelete }: SubtaskItemProps) {
  const { theme } = useTheme();
  const checkColor = color || LaneColors.now.primary;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 15 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
    }, 100);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={animatedStyle}
    >
      <Animated.View
        entering={FadeInRight.duration(200)}
        exiting={FadeOutLeft.duration(200)}
        style={[
          styles.container,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: subtask.completed ? checkColor : theme.textTertiary,
              backgroundColor: subtask.completed ? checkColor : "transparent",
            },
          ]}
        >
          {subtask.completed ? (
            <Feather name="check" size={12} color="#FFFFFF" />
          ) : null}
        </View>
        <ThemedText
          type="body"
          style={[
            styles.title,
            subtask.completed && {
              textDecorationLine: "line-through",
              opacity: 0.6,
            },
          ]}
        >
          {subtask.title}
        </ThemedText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDelete();
          }}
          hitSlop={8}
        >
          <Feather name="x" size={18} color={theme.textTertiary} />
        </Pressable>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
  },
});
