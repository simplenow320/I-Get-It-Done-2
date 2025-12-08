import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, LaneColors } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  title?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  icon?: ReactNode;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  onPress,
  title,
  children,
  style,
  disabled = false,
  variant = "primary",
  icon,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const backgroundColor = variant === "primary" ? LaneColors.now.primary : theme.backgroundDefault;
  const textColor = variant === "primary" ? "#FFFFFF" : theme.text;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
        style,
        animatedStyle,
      ]}
    >
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <ThemedText
        type="body"
        style={[styles.buttonText]}
        lightColor={textColor}
        darkColor={textColor}
      >
        {title || children}
      </ThemedText>
    </AnimatedPressable>
  );
}

export { Button };

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    fontWeight: "600",
  },
  iconContainer: {},
});
