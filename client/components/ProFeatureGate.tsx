import React, { ReactNode } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface ProFeatureGateProps {
  children?: ReactNode;
  feature?: string;
  showUpgradePrompt?: boolean;
}

const PRO_BENEFITS = [
  { icon: "mic" as const, label: "Voice capture" },
  { icon: "target" as const, label: "Focus mode & timer" },
  { icon: "trending-up" as const, label: "Streaks & XP" },
  { icon: "users" as const, label: "Team delegation" },
  { icon: "refresh-cw" as const, label: "Weekly reset insights" },
];

export function ProFeatureGate({ children, feature, showUpgradePrompt = true }: ProFeatureGateProps) {
  const { hasProFeatures: isPro, lifetimeTasksCreated } = useSubscription();
  const { theme } = useTheme();
  const navigation = useNavigation();

  if (isPro) {
    return <>{children}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    (navigation as any).navigate("ProfileTab", { screen: "Subscription" });
  };

  const trialAvailable = lifetimeTasksCreated < 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.iconContainer, { backgroundColor: LaneColors.now.primary + "15" }]}>
        <Feather name="lock" size={24} color={LaneColors.now.primary} />
      </View>
      <ThemedText type="h4" style={styles.title}>
        {feature ? `${feature}` : "Pro Feature"}
      </ThemedText>
      <ThemedText type="small" secondary style={styles.description}>
        {trialAvailable
          ? `Create ${10 - lifetimeTasksCreated} more task${10 - lifetimeTasksCreated !== 1 ? "s" : ""} to unlock all Pro features free`
          : "Upgrade to unlock the full experience"}
      </ThemedText>

      <View style={styles.benefitsList}>
        {PRO_BENEFITS.map((benefit) => (
          <View key={benefit.label} style={styles.benefitRow}>
            <Feather name={benefit.icon} size={14} color={LaneColors.later.primary} />
            <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textPrimary }}>
              {benefit.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={handleUpgrade}
        style={({ pressed }) => [
          styles.upgradeButton,
          { backgroundColor: LaneColors.now.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText type="body" style={styles.upgradeText}>
          {trialAvailable ? "View Plans" : "Upgrade to Pro"}
        </ThemedText>
      </Pressable>

      {trialAvailable ? (
        <ThemedText type="caption" secondary style={{ marginTop: Spacing.sm, textAlign: "center" }}>
          First 10 tasks unlock everything free
        </ThemedText>
      ) : null}
    </View>
  );
}

export function useProFeature() {
  const { isPro, hasProFeatures, isTrialing, isPastDue, status, trialDaysRemaining, freeTrialActive, freeTasksRemaining, lifetimeTasksCreated } = useSubscription();
  
  return {
    isPro,
    hasProFeatures,
    isTrialing,
    isPastDue,
    canUseProFeatures: hasProFeatures && !isPastDue,
    status,
    trialDaysRemaining,
    freeTrialActive,
    freeTasksRemaining,
    lifetimeTasksCreated,
  };
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    maxWidth: 280,
  },
  benefitsList: {
    alignSelf: "stretch",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    minWidth: 180,
    alignItems: "center",
  },
  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
