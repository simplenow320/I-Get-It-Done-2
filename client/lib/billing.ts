import { Platform, Alert, Linking } from "react-native";
import { apiRequest, getApiUrl } from "./query-client";

export type BillingPlatform = "revenuecat" | "stripe";
export type PlanType = "monthly" | "annual";

export interface PurchaseResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export function getBillingPlatform(): BillingPlatform {
  if (Platform.OS === "ios") {
    return "revenuecat";
  }
  return "stripe";
}

export function shouldUseRevenueCat(): boolean {
  return Platform.OS === "ios";
}

export function shouldUseStripe(): boolean {
  return Platform.OS === "web";
}

export async function purchaseWithStripe(userId: string, priceId: string): Promise<PurchaseResult> {
  try {
    const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
      userId,
      priceId,
    });
    const data = await response.json();
    
    if (data.url) {
      if (Platform.OS === "web") {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
      return { success: true };
    }
    
    return { success: false, error: data.error || "Could not start checkout" };
  } catch (error: any) {
    return { success: false, error: error.message || "Checkout failed" };
  }
}

export async function openSubscriptionManagement(userId: string): Promise<void> {
  const platform = getBillingPlatform();
  
  if (platform === "revenuecat") {
    try {
      await Linking.openURL("https://apps.apple.com/account/subscriptions");
    } catch {
      Alert.alert("Error", "Could not open subscription settings");
    }
    return;
  }
  
  try {
    const response = await apiRequest("POST", "/api/stripe/create-portal-session", {
      userId,
    });
    const data = await response.json();
    
    if (data.url) {
      if (Platform.OS === "web") {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
    } else {
      Alert.alert("Error", data.error || "Could not open subscription management");
    }
  } catch (error: any) {
    Alert.alert("Error", error.message || "Something went wrong");
  }
}

export function getPriceComparison() {
  return {
    mobile: {
      monthly: "$7.99",
      annual: "$59.99",
      annualMonthly: "$5.00",
      lifetime: "$149.99",
      savings: 37,
    },
    stripe: {
      monthly: "$7.99",
      annual: "$59.99",
      annualMonthly: "$5.00",
      lifetime: "$149.99",
      savings: 37,
    },
  };
}
