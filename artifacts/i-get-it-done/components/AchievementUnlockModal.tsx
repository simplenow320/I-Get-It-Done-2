import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "./ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useGamification } from "@/stores/GamificationStore";

export function AchievementUnlockModal() {
  const { theme, isDark } = useTheme();
  const colors = theme;
  const { pendingUnlock, dismissUnlock } = useGamification();
  const hasTriggeredHaptic = useRef(false);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (pendingUnlock) {
      hasTriggeredHaptic.current = false;
      scale.value = 0;
      opacity.value = 0;
      iconScale.value = 0;

      opacity.value = withSpring(1);
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      iconScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.3, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 12, stiffness: 200 })
        )
      );

      if (!hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [pendingUnlock]);

  const handleDismiss = () => {
    scale.value = withSpring(0, { damping: 15 });
    opacity.value = withSpring(0, { damping: 15 }, () => {
      runOnJS(dismissUnlock)();
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.7,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!pendingUnlock) return null;

  return (
    <Modal visible={true} transparent animationType="none" statusBarTranslucent>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.blur}>
            <LinearGradient
              colors={["#FFD700", "#FFA500", "#FF8C00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            >
              <View style={[styles.content, { backgroundColor: colors.backgroundDefault }]}>
                <ThemedText style={styles.unlockLabel}>Achievement Unlocked</ThemedText>

                <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
                  <LinearGradient
                    colors={["#FFD700", "#FFA500"]}
                    style={styles.iconGradient}
                  >
                    <Feather
                      name={pendingUnlock.icon as any}
                      size={40}
                      color="#fff"
                    />
                  </LinearGradient>
                </Animated.View>

                <ThemedText style={styles.title}>{pendingUnlock.title}</ThemedText>
                <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
                  {pendingUnlock.description}
                </ThemedText>

                <Pressable
                  style={({ pressed }) => [
                    styles.dismissButton,
                    { backgroundColor: colors.link, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleDismiss}
                >
                  <ThemedText style={styles.dismissText}>Awesome</ThemedText>
                </Pressable>
              </View>
            </LinearGradient>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  blur: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  gradientBorder: {
    padding: 2,
    borderRadius: BorderRadius.xl,
  },
  content: {
    borderRadius: BorderRadius.xl - 2,
    padding: Spacing.xl,
    alignItems: "center",
  },
  unlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#FFD700",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  dismissButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 140,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
