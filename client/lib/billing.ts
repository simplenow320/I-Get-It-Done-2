import { Platform, Alert, Linking } from "react-native";

export type PlanType = "monthly" | "annual";

export interface PurchaseResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export async function openSubscriptionManagement(userId: string): Promise<void> {
  try {
    if (Platform.OS === "ios") {
      await Linking.openURL("https://apps.apple.com/account/subscriptions");
    } else if (Platform.OS === "android") {
      await Linking.openURL("https://play.google.com/store/account/subscriptions");
    } else {
      Alert.alert("Manage Subscription", "Please manage your subscription through the App Store or Google Play Store on your mobile device.");
    }
  } catch {
    Alert.alert("Error", "Could not open subscription settings");
  }
}

export function getPriceComparison() {
  return {
    monthly: "$7.99",
    annual: "$59.99",
    annualMonthly: "$5.00",
    lifetime: "$149.99",
    savings: 37,
  };
}
