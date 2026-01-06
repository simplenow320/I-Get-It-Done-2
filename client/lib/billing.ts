import { Platform, Alert, Linking } from "react-native";
import { apiRequest, getApiUrl } from "./query-client";

export type BillingPlatform = "stripe" | "ios" | "android";
export type PlanType = "monthly" | "annual";

export interface BillingProduct {
  id: string;
  platform: BillingPlatform;
  type: PlanType;
  price: number;
  priceFormatted: string;
  currency: string;
  interval: "month" | "year";
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
  transactionId?: string;
}

export function getBillingPlatform(): BillingPlatform {
  if (Platform.OS === "ios") {
    return "ios";
  }
  if (Platform.OS === "android") {
    return "android";
  }
  return "stripe";
}

export function shouldUseStoreKit(): boolean {
  return Platform.OS === "ios";
}

export function shouldUseStripe(): boolean {
  return Platform.OS === "web" || Platform.OS === "android";
}

export const IOS_PRODUCT_IDS = {
  monthly: "com.igetitdone.pro.monthly",
  annual: "com.igetitdone.pro.annual",
} as const;

export const IOS_PRICES = {
  monthly: { amount: 7.99, formatted: "$7.99" },
  annual: { amount: 59.99, formatted: "$59.99" },
} as const;

async function purchaseWithStripe(userId: string, priceId: string): Promise<PurchaseResult> {
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

async function purchaseWithIAP(productId: string, userId: string): Promise<PurchaseResult> {
  Alert.alert(
    "Coming Soon",
    "In-app purchases will be available when the app is published to the App Store. For now, you can subscribe on our website.",
    [
      { text: "OK", style: "cancel" },
      { 
        text: "Open Website", 
        onPress: () => {
          const apiUrl = getApiUrl();
          Linking.openURL(`${apiUrl}/subscribe`);
        }
      }
    ]
  );
  
  return { 
    success: false, 
    error: "IAP not available in development" 
  };
}

export async function purchaseSubscription(
  userId: string,
  planType: PlanType,
  stripePriceId?: string
): Promise<PurchaseResult> {
  const platform = getBillingPlatform();
  
  if (platform === "ios") {
    const productId = IOS_PRODUCT_IDS[planType];
    return purchaseWithIAP(productId, userId);
  }
  
  if (!stripePriceId) {
    return { success: false, error: "Price not available" };
  }
  
  return purchaseWithStripe(userId, stripePriceId);
}

export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  const platform = getBillingPlatform();
  
  if (platform !== "ios") {
    return { success: false, error: "Restore only available on iOS" };
  }
  
  Alert.alert(
    "Restore Purchases",
    "Purchase restoration will be available when the app is published to the App Store.",
    [{ text: "OK" }]
  );
  
  return { success: false, error: "IAP not available in development" };
}

export async function openSubscriptionManagement(userId: string): Promise<void> {
  const platform = getBillingPlatform();
  
  if (platform === "ios") {
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
    ios: {
      monthly: IOS_PRICES.monthly.formatted,
      annual: IOS_PRICES.annual.formatted,
      annualMonthly: `$${(IOS_PRICES.annual.amount / 12).toFixed(2)}`,
      savings: Math.round((1 - (IOS_PRICES.annual.amount / 12 / IOS_PRICES.monthly.amount)) * 100),
    },
    stripe: {
      monthly: "$6.99",
      annual: "$49.99",
      annualMonthly: "$4.17",
      savings: 40,
    },
  };
}

export function getRevenueAfterFees(planType: PlanType, platform: BillingPlatform, year: 1 | 2): number {
  const prices = {
    ios: { monthly: 7.99, annual: 59.99 },
    stripe: { monthly: 6.99, annual: 49.99 },
    android: { monthly: 6.99, annual: 49.99 },
  };
  
  const fees = {
    ios: { year1: 0.30, year2: 0.15 },
    android: { year1: 0.15, year2: 0.15 },
    stripe: { year1: 0.029, year2: 0.029 },
  };
  
  const price = prices[platform][planType];
  const feeRate = year === 1 ? fees[platform].year1 : fees[platform].year2;
  
  if (platform === "stripe") {
    return price * (1 - feeRate) - 0.30;
  }
  
  return price * (1 - feeRate);
}
