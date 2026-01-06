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
  children: ReactNode;
  feature?: string;
  showUpgradePrompt?: boolean;
}

export function ProFeatureGate({ children, feature, showUpgradePrompt = true }: ProFeatureGateProps) {
  const { isPro } = useSubscription();
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
    (navigation as any).navigate("Profile", { screen: "Subscription" });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.iconContainer, { backgroundColor: LaneColors.now.primary + "15" }]}>
        <Feather name="lock" size={24} color={LaneColors.now.primary} />
      </View>
      <ThemedText type="h4" style={styles.title}>
        Pro Feature
      </ThemedText>
      <ThemedText type="small" secondary style={styles.description}>
        {feature ? `${feature} is` : "This feature is"} available with a Pro subscription
      </ThemedText>
      <Pressable
        onPress={handleUpgrade}
        style={({ pressed }) => [
          styles.upgradeButton,
          { backgroundColor: LaneColors.now.primary, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <ThemedText type="body" style={styles.upgradeText}>
          Upgrade to Pro
        </ThemedText>
      </Pressable>
    </View>
  );
}

export function useProFeature() {
  const { isPro, isTrialing, isPastDue, status, trialDaysRemaining } = useSubscription();
  
  return {
    isPro,
    isTrialing,
    isPastDue,
    canUseProFeatures: isPro && !isPastDue,
    status,
    trialDaysRemaining,
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
    maxWidth: 250,
  },
  upgradeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  upgradeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
