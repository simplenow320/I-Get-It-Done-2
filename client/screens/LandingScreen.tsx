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

const painPoints = [
  {
    icon: "clock" as const,
    problem: "Time blindness",
    solution: "Visual timers that keep you anchored",
  },
  {
    icon: "play" as const,
    problem: "Can't start tasks",
    solution: "Break It Down makes starting easy",
  },
  {
    icon: "layers" as const,
    problem: "Overwhelmed by big tasks",
    solution: "Small steps with instant progress",
  },
  {
    icon: "zap" as const,
    problem: "Low motivation",
    solution: "Streaks and wins that fuel your brain",
  },
];

const lanes = [
  { title: "Now", desc: "Today's focus", color: LaneColors.now.primary },
  { title: "Soon", desc: "Next few days", color: LaneColors.soon.primary },
  { title: "Later", desc: "This week", color: LaneColors.later.primary },
  { title: "Park", desc: "Safe for ideas", color: LaneColors.park.primary },
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
          Your brain works different.{"\n"}This app does too.
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.truthSection}>
        <View style={[styles.truthCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}>
          <ThemedText type="body" style={styles.truthText}>
            Whether you have been diagnosed with ADHD or you just struggle to finish what you start...
          </ThemedText>
          <ThemedText type="h3" style={styles.truthHighlight}>
            Every single feature in this app was built with you in mind.
          </ThemedText>
          <ThemedText type="small" secondary style={styles.truthSubtext}>
            Research-backed. Clinically informed. Built for brains that work fast, think big, and need things simple.
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.problemSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          We Know Your Struggle
        </ThemedText>
        <ThemedText type="body" secondary style={styles.sectionSubtitle}>
          And we built solutions for each one
        </ThemedText>
        
        {painPoints.map((item, index) => (
          <Animated.View
            key={item.problem}
            entering={FadeInUp.delay(500 + index * 80).duration(400)}
            style={[styles.painCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.painIcon, { backgroundColor: LaneColors.now.primary }]}>
              <Feather name={item.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.painContent}>
              <ThemedText type="body" style={styles.painProblem}>
                {item.problem}
              </ThemedText>
              <ThemedText type="small" secondary>
                {item.solution}
              </ThemedText>
            </View>
            <Feather name="check" size={20} color={LaneColors.now.primary} />
          </Animated.View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.systemSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          A System That Actually Works
        </ThemedText>
        <ThemedText type="body" secondary style={styles.sectionSubtitle}>
          Four lanes. Zero confusion. No more chaos.
        </ThemedText>
        
        <View style={styles.lanesGrid}>
          <View style={styles.lanesRow}>
            {lanes.slice(0, 2).map((lane, index) => (
              <Animated.View
                key={lane.title}
                entering={FadeInUp.delay(900 + index * 100).duration(400)}
                style={[styles.laneCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneDot, { backgroundColor: lane.color }]} />
                <ThemedText type="h4">{lane.title}</ThemedText>
                <ThemedText type="small" secondary>{lane.desc}</ThemedText>
              </Animated.View>
            ))}
          </View>
          <View style={styles.lanesRow}>
            {lanes.slice(2, 4).map((lane, index) => (
              <Animated.View
                key={lane.title}
                entering={FadeInUp.delay(1100 + index * 100).duration(400)}
                style={[styles.laneCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={[styles.laneDot, { backgroundColor: lane.color }]} />
                <ThemedText type="h4">{lane.title}</ThemedText>
                <ThemedText type="small" secondary>{lane.desc}</ThemedText>
              </Animated.View>
            ))}
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1200).duration(600)} style={styles.featuresSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Built From Research
        </ThemedText>
        
        <View style={styles.featuresList}>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Quick Dump for rapid brain capture</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Break It Down to make starting easy</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Focus Timer to beat time blindness</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Streaks and wins for dopamine boost</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Weekly Reset to prevent chaos buildup</ThemedText>
          </View>
          <View style={styles.featureRow}>
            <Feather name="check-circle" size={18} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.featureText}>Hand-off mode to reduce mental load</ThemedText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1400).duration(600)} style={styles.ctaSection}>
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
            Stop fighting your brain.
          </ThemedText>
          <ThemedText
            type="h2"
            style={styles.ctaTitle}
            lightColor="#FFFFFF"
            darkColor="#FFFFFF"
          >
            Start working with it.
          </ThemedText>
          <ThemedText
            type="body"
            style={styles.ctaDescription}
            lightColor="rgba(255,255,255,0.9)"
            darkColor="rgba(255,255,255,0.9)"
          >
            Simple. Fast. Doable. Built for brains like yours.
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
              Get Started Now
            </ThemedText>
            <Feather name="arrow-right" size={20} color={LaneColors.now.primary} />
          </Pressable>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(1500).duration(400)} style={styles.footer}>
        <ThemedText type="small" secondary style={styles.footerText}>
          No account needed. Your data stays private on your device.
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
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroTagline: {
    textAlign: "center",
    lineHeight: 38,
  },
  truthSection: {
    marginBottom: Spacing.xl,
  },
  truthCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
  },
  truthText: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  truthHighlight: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  truthSubtext: {
    textAlign: "center",
    fontStyle: "italic",
  },
  problemSection: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  painCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  painIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  painContent: {
    flex: 1,
  },
  painProblem: {
    fontWeight: "600",
    marginBottom: 2,
  },
  systemSection: {
    marginBottom: Spacing.xl,
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
    gap: Spacing.xs,
  },
  laneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.xs,
  },
  featuresSection: {
    marginBottom: Spacing.xl,
  },
  featuresList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureText: {
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
    lineHeight: 32,
  },
  ctaDescription: {
    textAlign: "center",
    marginTop: Spacing.sm,
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
