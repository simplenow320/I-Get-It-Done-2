import React from "react";
import { StyleSheet, View, ScrollView, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Landing">;

const features = [
  {
    icon: "zap" as const,
    title: "Now",
    description: "Today's focus",
    color: LaneColors.now.primary,
  },
  {
    icon: "clock" as const,
    title: "Soon",
    description: "Next few days",
    color: LaneColors.soon.primary,
  },
  {
    icon: "calendar" as const,
    title: "Later",
    description: "This week",
    color: LaneColors.later.primary,
  },
  {
    icon: "archive" as const,
    title: "Park",
    description: "Ideas to revisit",
    color: LaneColors.park.primary,
  },
];

const benefits = [
  {
    icon: "target" as const,
    title: "Stay Focused",
    description: "Know exactly what to work on right now",
  },
  {
    icon: "trending-up" as const,
    title: "Track Progress",
    description: "Watch your productivity grow each week",
  },
  {
    icon: "refresh-cw" as const,
    title: "Weekly Reset",
    description: "Review accomplishments and plan ahead",
  },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleGetStarted = () => {
    navigation.navigate("Onboarding");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.heroSection}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.heroIcon}
          resizeMode="contain"
        />
        <ThemedText type="wordmark" style={styles.heroTitle}>
          I GET IT DONE
        </ThemedText>
        <ThemedText type="h1" style={styles.heroTagline}>
          Finish what matters.{"\n"}Today.
        </ThemedText>
        <ThemedText type="body" secondary style={styles.heroDescription}>
          A simple 4-lane system that helps you prioritize tasks and crush your goals.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.lanesSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          The 4-Lane System
        </ThemedText>
        <View style={styles.lanesGrid}>
          <View style={styles.lanesRow}>
            {features.slice(0, 2).map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInUp.delay(400 + index * 100).duration(400)}
                style={[styles.laneCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneIconContainer, { backgroundColor: feature.color }]}>
                  <Feather name={feature.icon} size={20} color="#FFFFFF" />
                </View>
                <ThemedText type="h4" style={styles.laneTitle}>
                  {feature.title}
                </ThemedText>
                <ThemedText type="small" secondary style={styles.laneDescription}>
                  {feature.description}
                </ThemedText>
              </Animated.View>
            ))}
          </View>
          <View style={styles.lanesRow}>
            {features.slice(2, 4).map((feature, index) => (
              <Animated.View
                key={feature.title}
                entering={FadeInUp.delay(600 + index * 100).duration(400)}
                style={[styles.laneCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneIconContainer, { backgroundColor: feature.color }]}>
                  <Feather name={feature.icon} size={20} color="#FFFFFF" />
                </View>
                <ThemedText type="h4" style={styles.laneTitle}>
                  {feature.title}
                </ThemedText>
                <ThemedText type="small" secondary style={styles.laneDescription}>
                  {feature.description}
                </ThemedText>
              </Animated.View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.benefitsSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Why It Works
        </ThemedText>
        {benefits.map((benefit, index) => (
          <Animated.View
            key={benefit.title}
            entering={FadeInUp.delay(900 + index * 100).duration(400)}
            style={[styles.benefitRow, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.benefitIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
              <Feather name={benefit.icon} size={24} color={LaneColors.now.primary} />
            </View>
            <View style={styles.benefitContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {benefit.title}
              </ThemedText>
              <ThemedText type="small" secondary>
                {benefit.description}
              </ThemedText>
            </View>
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1200).duration(600)} style={styles.ctaSection}>
        <LinearGradient
          colors={LaneColors.now.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <ThemedText
            type="h2"
            style={styles.ctaTitle}
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
          >
            Ready to get things done?
          </ThemedText>
          <ThemedText
            type="body"
            style={styles.ctaDescription}
            lightColor="rgba(255,255,255,0.9)"
            darkColor="rgba(255,255,255,0.9)"
          >
            Start organizing your tasks in minutes
          </ThemedText>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.ctaButton,
              { 
                backgroundColor: theme.backgroundRoot,
                opacity: pressed ? 0.9 : 1, 
                transform: [{ scale: pressed ? 0.98 : 1 }] 
              },
            ]}
          >
            <ThemedText type="body" style={[styles.ctaButtonText, { color: LaneColors.now.primary }]}>
              Get Started Free
            </ThemedText>
            <Feather name="arrow-right" size={20} color={LaneColors.now.primary} />
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1300).duration(400)} style={styles.footer}>
        <ThemedText type="small" secondary style={styles.footerText}>
          No account required. Your data stays on your device.
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroTagline: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  heroDescription: {
    textAlign: "center",
    maxWidth: 320,
  },
  lanesSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  lanesGrid: {
    gap: Spacing.sm,
  },
  lanesRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  laneCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  laneIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  laneTitle: {
    marginBottom: Spacing.xs,
  },
  laneDescription: {
    textAlign: "center",
  },
  benefitsSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitContent: {
    flex: 1,
  },
  ctaSection: {
    marginBottom: Spacing.lg,
  },
  ctaCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  ctaTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  ctaDescription: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  ctaButtonText: {
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
  },
});
