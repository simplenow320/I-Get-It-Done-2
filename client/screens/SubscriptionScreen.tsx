import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useRevenueCat } from "@/contexts/RevenueCatContext";
import { openSubscriptionManagement } from "@/lib/billing";

type PricingPlan = "monthly" | "annual";

const FEATURES = [
  { icon: "zap", text: "Unlimited tasks across all lanes" },
  { icon: "mic", text: "Voice-to-task capture" },
  { icon: "clock", text: "Focus timers and sprints" },
  { icon: "award", text: "Gamification and streaks" },
  { icon: "users", text: "Team delegation mode" },
  { icon: "refresh-cw", text: "Weekly reset insights" },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    isReady: rcReady, 
    isPro, 
    isTrialing, 
    purchasePackage, 
    restorePurchases,
    monthlyPackage,
    annualPackage,
  } = useRevenueCat();
  
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>("annual");
  const [isLoading, setIsLoading] = useState(false);

  const monthlyPrice = monthlyPackage?.product.priceString.replace("$", "") || "6.99";
  const annualPrice = annualPackage?.product.priceString.replace("$", "") || "49.99";
  const annualMonthly = (parseFloat(annualPrice) / 12).toFixed(2);
  const savings = Math.round((1 - (parseFloat(annualMonthly) / parseFloat(monthlyPrice))) * 100);

  const handleSelectPlan = (plan: PricingPlan) => {
    Haptics.selectionAsync();
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to subscribe.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      const pkg = selectedPlan === "monthly" ? monthlyPackage : annualPackage;
      if (!pkg) {
        Alert.alert("Not Available", "Pricing not available yet. Please try again in a moment.");
        return;
      }
      await purchasePackage(pkg);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoading(true);
    try {
      await restorePurchases();
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!user?.id) return;
    await openSubscriptionManagement(user.id);
  };

  const getStatusMessage = () => {
    if (isTrialing) {
      return { text: "You're on a free trial", color: LaneColors.soon.primary };
    }
    if (isPro) {
      return { text: "You have full Pro access", color: LaneColors.later.primary };
    }
    return null;
  };

  const statusMessage = getStatusMessage();
  const showLoading = isLoading || !rcReady;

  if (isPro || isTrialing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
            <LinearGradient
              colors={LaneColors.later.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Feather name="check-circle" size={32} color="#FFFFFF" />
            </LinearGradient>
            <ThemedText type="largeTitle" style={styles.title}>
              Pro Member
            </ThemedText>
            {statusMessage ? (
              <ThemedText type="body" style={[styles.subtitle, { color: statusMessage.color }]}>
                {statusMessage.text}
              </ThemedText>
            ) : null}
          </Animated.View>

          {isTrialing ? (
            <Animated.View entering={FadeInUp.delay(150).duration(400)}>
              <View style={[styles.trialCard, { backgroundColor: LaneColors.soon.primary + "15" }]}>
                <Feather name="clock" size={24} color={LaneColors.soon.primary} />
                <View style={styles.trialCardContent}>
                  <ThemedText type="h4" style={{ color: LaneColors.soon.primary }}>
                    Trial Period
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    You're currently on a free trial. You won't be charged until your trial ends.
                  </ThemedText>
                </View>
              </View>
            </Animated.View>
          ) : null}


          <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.featuresContainer}>
            <ThemedText type="h4" style={styles.featuresTitle}>
              Your Pro Features
            </ThemedText>
            <View style={[styles.featuresList, { backgroundColor: theme.backgroundDefault }]}>
              {FEATURES.map((feature) => (
                <View key={feature.text} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: LaneColors.later.primary + "15" }]}>
                    <Feather name={feature.icon as any} size={16} color={LaneColors.later.primary} />
                  </View>
                  <ThemedText type="body" style={styles.featureText}>
                    {feature.text}
                  </ThemedText>
                  <Feather name="check" size={16} color={LaneColors.later.primary} />
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.ctaContainer}>
            <Pressable
              onPress={handleManageSubscription}
              disabled={showLoading}
              style={({ pressed }) => [
                styles.manageButton,
                { 
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  opacity: (pressed || showLoading) ? 0.9 : 1 
                },
              ]}
            >
              {showLoading ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <>
                  <Feather name="settings" size={20} color={theme.text} />
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Manage Subscription
                  </ThemedText>
                </>
              )}
            </Pressable>
            <ThemedText type="caption" secondary style={styles.manageNote}>
              Update payment method, change plan, or cancel
            </ThemedText>
          </Animated.View>
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.header}>
          <LinearGradient
            colors={LaneColors.now.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <Feather name="star" size={32} color="#FFFFFF" />
          </LinearGradient>
          <ThemedText type="largeTitle" style={styles.title}>
            Unlock Pro
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Start your 7-day free trial today
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.plansContainer}>
              <Pressable
                onPress={() => handleSelectPlan("annual")}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: selectedPlan === "annual" ? LaneColors.now.primary : theme.border,
                    borderWidth: selectedPlan === "annual" ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.planBadge}>
                  <LinearGradient
                    colors={LaneColors.now.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.savingsBadge}
                  >
                    <ThemedText type="caption" style={styles.savingsText}>
                      SAVE {savings}%
                    </ThemedText>
                  </LinearGradient>
                </View>
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === "annual" ? LaneColors.now.primary : theme.textSecondary }
                  ]}>
                    {selectedPlan === "annual" ? (
                      <View style={[styles.radioInner, { backgroundColor: LaneColors.now.primary }]} />
                    ) : null}
                  </View>
                  <View style={styles.planInfo}>
                    <ThemedText type="h3">Annual</ThemedText>
                    <ThemedText type="small" secondary>
                      Best value
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.planPricing}>
                  <ThemedText type="largeTitle" style={styles.priceAmount}>
                    ${annualPrice}
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    /year (${annualMonthly}/mo)
                  </ThemedText>
                </View>
              </Pressable>

              <Pressable
                onPress={() => handleSelectPlan("monthly")}
                style={({ pressed }) => [
                  styles.planCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: selectedPlan === "monthly" ? LaneColors.now.primary : theme.border,
                    borderWidth: selectedPlan === "monthly" ? 2 : 1,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.planHeader}>
                  <View style={[
                    styles.radioOuter,
                    { borderColor: selectedPlan === "monthly" ? LaneColors.now.primary : theme.textSecondary }
                  ]}>
                    {selectedPlan === "monthly" ? (
                      <View style={[styles.radioInner, { backgroundColor: LaneColors.now.primary }]} />
                    ) : null}
                  </View>
                  <View style={styles.planInfo}>
                    <ThemedText type="h3">Monthly</ThemedText>
                    <ThemedText type="small" secondary>
                      Flexible
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.planPricing}>
                  <ThemedText type="largeTitle" style={styles.priceAmount}>
                    ${monthlyPrice}
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    /month
                  </ThemedText>
                </View>
              </Pressable>

            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.featuresContainer}>
              <ThemedText type="h4" style={styles.featuresTitle}>
                Everything in Pro
              </ThemedText>
              <View style={[styles.featuresList, { backgroundColor: theme.backgroundDefault }]}>
                {FEATURES.map((feature) => (
                  <View key={feature.text} style={styles.featureRow}>
                    <View style={[styles.featureIcon, { backgroundColor: LaneColors.now.primary + "15" }]}>
                      <Feather name={feature.icon as any} size={16} color={LaneColors.now.primary} />
                    </View>
                    <ThemedText type="body" style={styles.featureText}>
                      {feature.text}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.ctaContainer}>
              <Pressable
                onPress={handleSubscribe}
                disabled={showLoading}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { opacity: (pressed || showLoading) ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={LaneColors.now.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  {showLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <ThemedText type="h4" style={styles.ctaText}>
                        Start Free Trial
                      </ThemedText>
                      <Feather name="arrow-right" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
              <ThemedText type="caption" secondary style={styles.trialNote}>
                7 days free, then {selectedPlan === "annual" ? `$${annualPrice}/year` : `$${monthlyPrice}/month`}
              </ThemedText>
              <ThemedText type="caption" secondary style={styles.cancelNote}>
                Cancel anytime. No commitment.
              </ThemedText>
              <Pressable 
                onPress={handleRestore}
                disabled={showLoading}
                style={styles.restoreButton}
              >
                <ThemedText type="caption" style={{ color: LaneColors.later.primary }}>
                  Restore Purchases
                </ThemedText>
              </Pressable>
              
              <View style={styles.legalLinks}>
                <Pressable onPress={() => Linking.openURL("https://www.igetitdone.co/privacy")}>
                  <ThemedText type="caption" style={styles.legalLink}>Privacy Policy</ThemedText>
                </Pressable>
                <ThemedText type="caption" secondary style={styles.legalSeparator}>|</ThemedText>
                <Pressable onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
                  <ThemedText type="caption" style={styles.legalLink}>Terms of Use</ThemedText>
                </Pressable>
              </View>
            </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
  },
  trialCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  trialCardContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  errorCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  errorText: {
    textAlign: "center",
  },
  plansContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  planCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    position: "relative",
  },
  planBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
  },
  savingsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  savingsText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  planInfo: {
    flex: 1,
  },
  planPricing: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.xs,
  },
  priceAmount: {
    fontWeight: "700",
  },
  featuresContainer: {
    marginBottom: Spacing.xl,
  },
  featuresTitle: {
    marginBottom: Spacing.md,
  },
  featuresList: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  ctaContainer: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  ctaButton: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  trialNote: {
    textAlign: "center",
  },
  cancelNote: {
    textAlign: "center",
  },
  restoreButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    width: "100%",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  manageNote: {
    textAlign: "center",
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  legalLink: {
    color: LaneColors.later.primary,
  },
  legalSeparator: {
    opacity: 0.5,
  },
});
