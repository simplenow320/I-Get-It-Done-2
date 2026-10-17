import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

export default function SubscriptionCancelScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleTryAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.goBack();
  };

  const handleGoHome = () => {
    Haptics.selectionAsync();
    navigation.reset({
      index: 0,
      routes: [{ name: "Profile" as never }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.iconWrapper}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="x" size={48} color={theme.textSecondary} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.textContainer}>
          <ThemedText type="largeTitle" style={styles.title}>
            Checkout Canceled
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            No worries! Your subscription wasn't started and you haven't been charged. You can try again whenever you're ready.
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.buttonContainer}>
          <Pressable
            onPress={handleTryAgain}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: LaneColors.now.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="h4" style={styles.buttonText}>
              Try Again
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Return to Profile
            </ThemedText>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 300,
  },
  buttonContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: "#FFFFFF",
  },
});
