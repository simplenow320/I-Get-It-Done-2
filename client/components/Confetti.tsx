import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#007AFF",
  "#AF52DE",
  "#FF2D55",
];

interface ConfettiPieceProps {
  index: number;
  color: string;
  startX: number;
  endX: number;
  delay: number;
  onComplete?: () => void;
  isLast: boolean;
}

function ConfettiPiece({ index, color, startX, endX, delay, onComplete, isLast }: ConfettiPieceProps) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 150, easing: Easing.out(Easing.back(2)) }),
        withDelay(800, withTiming(0, { duration: 300 }))
      )
    );

    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.in(Easing.quad),
      })
    );

    translateX.value = withDelay(
      delay,
      withTiming(endX, {
        duration: 2000 + Math.random() * 1000,
        easing: Easing.inOut(Easing.sin),
      })
    );

    rotate.value = withDelay(
      delay,
      withTiming(360 * (2 + Math.random() * 3) * (Math.random() > 0.5 ? 1 : -1), {
        duration: 2500,
        easing: Easing.linear,
      })
    );

    opacity.value = withDelay(
      delay + 1500,
      withTiming(0, { duration: 500 }, (finished) => {
        if (finished && isLast && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const size = 8 + Math.random() * 8;
  const isCircle = index % 3 === 0;
  const isSquare = index % 3 === 1;

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        animatedStyle,
        {
          backgroundColor: color,
          width: isCircle ? size : size * 0.6,
          height: isCircle ? size : size * 1.5,
          borderRadius: isCircle ? size / 2 : isSquare ? 2 : 0,
        },
      ]}
    />
  );
}

interface ConfettiProps {
  visible: boolean;
  onComplete?: () => void;
  count?: number;
}

export default function Confetti({ visible, onComplete, count = 50 }: ConfettiProps) {
  const pieces = useMemo(() => {
    if (!visible) return [];
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * SCREEN_WIDTH,
      endX: Math.random() * SCREEN_WIDTH,
      delay: Math.random() * 300,
    }));
  }, [visible, count]);

  if (!visible || pieces.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((piece, index) => (
        <ConfettiPiece
          key={piece.id}
          index={index}
          color={piece.color}
          startX={piece.startX}
          endX={piece.endX}
          delay={piece.delay}
          onComplete={onComplete}
          isLast={index === pieces.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: "none",
  },
  confettiPiece: {
    position: "absolute",
    top: 0,
  },
});
