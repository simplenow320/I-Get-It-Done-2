import React, { useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

export default function SubscriptionSuccessScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { refetch, isTrialing } = useSubscription();

  useEffect(() => {
    refetch();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.reset({
      index: 0,
      routes: [{ name: "Profile" as never }],
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.iconWrapper}>
          <LinearGradient
            colors={LaneColors.later.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Feather name="check" size={48} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.textContainer}>
          <ThemedText type="largeTitle" style={styles.title}>
            Welcome to Pro
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            {isTrialing
              ? "Your 7-day free trial has started. Enjoy full access to all Pro features."
              : "Your subscription is now active. Enjoy full access to all Pro features."}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.featuresCard}>
          <View style={[styles.featureItem, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.featureIcon, { backgroundColor: LaneColors.now.primary + "15" }]}>
              <Feather name="mic" size={20} color={LaneColors.now.primary} />
            </View>
            <ThemedText type="body">Voice-to-task capture</ThemedText>
          </View>
          <View style={[styles.featureItem, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.featureIcon, { backgroundColor: LaneColors.soon.primary + "15" }]}>
              <Feather name="users" size={20} color={LaneColors.soon.primary} />
            </View>
            <ThemedText type="body">Team delegation</ThemedText>
          </View>
          <View style={[styles.featureItem, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.featureIcon, { backgroundColor: LaneColors.later.primary + "15" }]}>
              <Feather name="zap" size={20} color={LaneColors.later.primary} />
            </View>
            <ThemedText type="body">Unlimited tasks</ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.buttonContainer}>
          <Pressable onPress={handleContinue} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient
              colors={LaneColors.later.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <ThemedText type="h4" style={styles.buttonText}>
                Start Using Pro
              </ThemedText>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
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
  featuresCard: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: "#FFFFFF",
  },
});
