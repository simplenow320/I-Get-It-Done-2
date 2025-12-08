import React from "react";
import { StyleSheet, View, ScrollView, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type RootNavigation = NativeStackNavigationProp<RootStackParamList, "Landing">;
type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, "TourLanding">;

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<RootNavigation | ProfileNavigation>();
  const route = useRoute();

  const isTourMode = (route.params as { isTour?: boolean })?.isTour === true;

  const handleGetStarted = () => {
    if (isTourMode) {
      navigation.goBack();
    } else {
      (navigation as RootNavigation).navigate("Onboarding");
    }
  };

  const handleLearnMore = () => {
    if (isTourMode) {
      (navigation as ProfileNavigation).navigate("TourLearnMore", { isTour: true });
    } else {
      (navigation as RootNavigation).navigate("LearnMore");
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {isTourMode ? (
        <Pressable 
          onPress={handleClose} 
          style={[styles.closeButton, { top: insets.top + Spacing.sm }]}
          hitSlop={12}
        >
          <View style={[styles.closeIcon, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="x" size={20} color={theme.text} />
          </View>
        </Pressable>
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.heroSection}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.heroIcon}
            resizeMode="contain"
          />
          <ThemedText type="wordmark" style={styles.heroTitle}>
            I GET IT DONE
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.valueSection}>
          <ThemedText type="h1" style={styles.mainMessage}>
            Finally finish{"\n"}what you start.
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subMessage}>
            A simple app built for brains that think fast, get distracted easy, and need a system that actually works.
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.proofSection}>
          <View style={[styles.proofCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={20} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.proofText}>Research-backed features</ThemedText>
          </View>
          <View style={[styles.proofCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={20} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.proofText}>Built for ADHD brains</ThemedText>
          </View>
          <View style={[styles.proofCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="check-circle" size={20} color={LaneColors.now.primary} />
            <ThemedText type="body" style={styles.proofText}>Simple. No overwhelm.</ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.ctaSection}>
          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={LaneColors.now.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <ThemedText type="body" style={styles.primaryButtonText}>
                {isTourMode ? "Back to App" : "Get Started"}
              </ThemedText>
              <Feather name={isTourMode ? "arrow-left" : "arrow-right"} size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleLearnMore}
            style={({ pressed }) => [
              styles.secondaryButton,
              { 
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText type="body" style={styles.secondaryButtonText}>
              How does it work?
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.footer}>
          <ThemedText type="small" secondary style={styles.footerText}>
            No account needed. Your data stays on your device.
          </ThemedText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
  },
  closeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
    justifyContent: "center",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
  },
  valueSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  mainMessage: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 42,
  },
  subMessage: {
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 24,
  },
  proofSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  proofCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  proofText: {
    fontWeight: "500",
  },
  ctaSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
  },
});
