import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, withSpring } from "react-native-reanimated";

import { LaneColors } from "@/constants/theme";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 4,
  color = LaneColors.now.primary,
  backgroundColor = "rgba(128,128,128,0.2)",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = withSpring(
      circumference - (normalizedProgress / 100) * circumference,
      { damping: 20, stiffness: 90 }
    );
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          stroke={backgroundColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    transform: [{ rotateZ: "-90deg" }],
  },
});
