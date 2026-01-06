import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Alert, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";

type PricingPlan = "monthly" | "annual";

interface PriceInfo {
  id: string;
  unit_amount: number;
  recurring: { interval: string };
}

interface PricesResponse {
  prices: PriceInfo[];
}

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
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { isPro, isTrialing, isPastDue, isCanceled, status, trialDaysRemaining, refetch } = useSubscription();
  
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>("annual");

  const { data: pricesData, isLoading: loadingPrices, isError: pricesError } = useQuery<PricesResponse>({
    queryKey: ["/api/stripe/prices"],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const response = await fetch(new URL("/api/stripe/prices", getApiUrl()).toString(), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch prices");
      }
      return response.json();
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        userId: user?.id,
        priceId,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        if (user?.id) {
          await queryClient.invalidateQueries({ queryKey: ["/api/subscription", user.id] });
        }
        if (Platform.OS === "web") {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      } else {
        const errorMessage = data.error || "Could not start checkout.";
        Alert.alert("Error", errorMessage);
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-portal-session", {
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.url) {
        if (Platform.OS === "web") {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      } else {
        Alert.alert("Error", data.error || "Could not open subscription management.");
      }
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    },
  });

  const prices = pricesData?.prices || [];
  const monthlyPriceData = prices.find((p) => p.recurring?.interval === "month");
  const annualPriceData = prices.find((p) => p.recurring?.interval === "year");

  const handleSelectPlan = (plan: PricingPlan) => {
    Haptics.selectionAsync();
    setSelectedPlan(plan);
  };

  const handleSubscribe = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to subscribe.");
      return;
    }

    const priceId = selectedPlan === "monthly" ? monthlyPriceData?.id : annualPriceData?.id;
    if (!priceId) {
      Alert.alert("Error", "Pricing not available. Please try again later.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkoutMutation.mutate(priceId);
  };

  const handleManageSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    portalMutation.mutate();
  };

  const monthlyPrice = monthlyPriceData ? (monthlyPriceData.unit_amount / 100).toFixed(2) : "6.99";
  const annualPrice = annualPriceData ? (annualPriceData.unit_amount / 100).toFixed(2) : "49.99";
  const annualMonthly = annualPriceData ? ((annualPriceData.unit_amount / 100) / 12).toFixed(2) : "4.17";
  const savings = Math.round((1 - (parseFloat(annualMonthly) / parseFloat(monthlyPrice))) * 100);

  const isLoading = checkoutMutation.isPending || portalMutation.isPending;

  const getStatusMessage = () => {
    if (isPastDue) {
      return { text: "Payment failed - please update your payment method", color: LaneColors.now.primary };
    }
    if (isCanceled) {
      return { text: "Your subscription has been canceled", color: theme.textSecondary };
    }
    if (isTrialing) {
      return { text: `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left in your free trial`, color: LaneColors.soon.primary };
    }
    if (isPro) {
      return { text: "You have full Pro access", color: LaneColors.later.primary };
    }
    return null;
  };

  const statusMessage = getStatusMessage();

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
                    Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}. You won't be charged until then.
                  </ThemedText>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {isPastDue ? (
            <Animated.View entering={FadeInUp.delay(150).duration(400)}>
              <View style={[styles.trialCard, { backgroundColor: LaneColors.now.primary + "15" }]}>
                <Feather name="alert-circle" size={24} color={LaneColors.now.primary} />
                <View style={styles.trialCardContent}>
                  <ThemedText type="h4" style={{ color: LaneColors.now.primary }}>
                    Payment Issue
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    We couldn't process your payment. Please update your payment method to continue using Pro features.
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
              disabled={isLoading}
              style={({ pressed }) => [
                styles.manageButton,
                { 
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  opacity: (pressed || isLoading) ? 0.9 : 1 
                },
              ]}
            >
              {isLoading ? (
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

        {isCanceled ? (
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <View style={[styles.trialCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="info" size={24} color={theme.textSecondary} />
              <View style={styles.trialCardContent}>
                <ThemedText type="h4">Welcome Back</ThemedText>
                <ThemedText type="small" secondary>
                  Your previous subscription was canceled. Start a new subscription to regain Pro access.
                </ThemedText>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {pricesError ? (
          <View style={[styles.errorCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="alert-circle" size={24} color={LaneColors.now.primary} />
            <ThemedText type="body" secondary style={styles.errorText}>
              Unable to load pricing. Please try again later.
            </ThemedText>
          </View>
        ) : (
          <>
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
                disabled={isLoading || loadingPrices}
                style={({ pressed }) => [
                  styles.ctaButton,
                  { opacity: (pressed || isLoading) ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={LaneColors.now.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  {isLoading ? (
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
            </Animated.View>
          </>
        )}
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
  },
  ctaButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  ctaText: {
    color: "#FFFFFF",
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  manageNote: {
    textAlign: "center",
  },
  trialNote: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  cancelNote: {
    textAlign: "center",
  },
});
