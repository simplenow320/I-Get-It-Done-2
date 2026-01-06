import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface PaymentStatusBannerProps {
  compact?: boolean;
}

export function PaymentStatusBanner({ compact = false }: PaymentStatusBannerProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { isPastDue, isCanceled, isTrialing, trialDaysRemaining } = useSubscription();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    (navigation as any).navigate("Profile", { screen: "Subscription" });
  };

  if (isPastDue) {
    return (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.banner,
            { 
              backgroundColor: LaneColors.now.primary + "15",
              borderColor: LaneColors.now.primary + "30",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: LaneColors.now.primary + "20" }]}>
            <Feather name="alert-circle" size={compact ? 16 : 20} color={LaneColors.now.primary} />
          </View>
          <View style={styles.content}>
            <ThemedText type={compact ? "caption" : "body"} style={{ color: LaneColors.now.primary, fontWeight: "600" }}>
              Payment Failed
            </ThemedText>
            {!compact ? (
              <ThemedText type="caption" secondary>
                Update your payment method to continue using Pro features
              </ThemedText>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={LaneColors.now.primary} />
        </Pressable>
      </Animated.View>
    );
  }

  if (isTrialing && trialDaysRemaining <= 2) {
    return (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.banner,
            { 
              backgroundColor: LaneColors.soon.primary + "15",
              borderColor: LaneColors.soon.primary + "30",
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: LaneColors.soon.primary + "20" }]}>
            <Feather name="clock" size={compact ? 16 : 20} color={LaneColors.soon.primary} />
          </View>
          <View style={styles.content}>
            <ThemedText type={compact ? "caption" : "body"} style={{ color: LaneColors.soon.primary, fontWeight: "600" }}>
              {trialDaysRemaining === 0 ? "Trial ends today" : `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left in trial`}
            </ThemedText>
            {!compact ? (
              <ThemedText type="caption" secondary>
                Subscribe now to keep your Pro features
              </ThemedText>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={LaneColors.soon.primary} />
        </Pressable>
      </Animated.View>
    );
  }

  if (isCanceled) {
    return (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.banner,
            { 
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.textSecondary + "20" }]}>
            <Feather name="info" size={compact ? 16 : 20} color={theme.textSecondary} />
          </View>
          <View style={styles.content}>
            <ThemedText type={compact ? "caption" : "body"} style={{ fontWeight: "600" }}>
              Subscription Canceled
            </ThemedText>
            {!compact ? (
              <ThemedText type="caption" secondary>
                Resubscribe to regain Pro access
              </ThemedText>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
