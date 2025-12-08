import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { LaneColors } from "@/constants/theme";

interface TimerRingProps {
  timeRemaining: number;
  totalTime: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function TimerRing({
  timeRemaining,
  totalTime,
  size = 200,
  strokeWidth = 12,
  color = LaneColors.now.primary,
}: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;

  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          stroke="rgba(128,128,128,0.2)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.timeContainer}>
        <ThemedText type="heroNumber" style={styles.time}>
          {timeDisplay}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
    transform: [{ rotateZ: "-90deg" }],
  },
  timeContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 48,
  },
});
