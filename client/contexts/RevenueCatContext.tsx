import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform, Alert } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import Constants from "expo-constants";

interface RevenueCatContextType {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isPro: boolean;
  isTrialing: boolean;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  refreshCustomerInfo: () => Promise<void>;
  monthlyPackage: PurchasesPackage | null;
  annualPackage: PurchasesPackage | null;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

const REVENUECAT_API_KEY_IOS = Constants.expoConfig?.extra?.revenueCatApiKeyIOS || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || "";
const REVENUECAT_API_KEY_ANDROID = Constants.expoConfig?.extra?.revenueCatApiKeyAndroid || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || "";

const ENTITLEMENT_ID = "pro";

export function RevenueCatProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [isReady, setIsReady] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (Platform.OS === "web") {
        setIsReady(true);
        return;
      }

      try {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        const apiKey = Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
        
        if (!apiKey) {
          console.log("RevenueCat: No API key configured for", Platform.OS);
          setIsReady(true);
          return;
        }

        await Purchases.configure({
          apiKey,
          appUserID: userId || undefined,
        });

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          setCurrentOffering(offerings.current);
        }

        Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
        });

        setIsReady(true);
      } catch (error) {
        console.error("RevenueCat initialization error:", error);
        setIsReady(true);
      }
    };

    initRevenueCat();
  }, [userId]);

  useEffect(() => {
    const loginUser = async () => {
      if (!isReady || Platform.OS === "web" || !userId) return;
      
      try {
        const { customerInfo: info } = await Purchases.logIn(userId);
        setCustomerInfo(info);
      } catch (error) {
        console.error("RevenueCat login error:", error);
      }
    };

    loginUser();
  }, [isReady, userId]);

  const isPro = customerInfo?.entitlements.active[ENTITLEMENT_ID]?.isActive ?? false;
  const isTrialing = customerInfo?.entitlements.active[ENTITLEMENT_ID]?.periodType === "TRIAL";

  const monthlyPackage = currentOffering?.monthly ?? null;
  const annualPackage = currentOffering?.annual ?? null;

  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "In-app purchases are only available on iOS and Android devices.");
      return false;
    }

    try {
      const { customerInfo: info } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(info);
      
      if (info.entitlements.active[ENTITLEMENT_ID]) {
        return true;
      }
      return false;
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error("Purchase error:", error);
        Alert.alert("Purchase Failed", error.message || "Could not complete purchase. Please try again.");
      }
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      Alert.alert("Not Available", "Restore is only available on iOS and Android devices.");
      return false;
    }

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      
      if (info.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert("Success", "Your purchases have been restored!");
        return true;
      } else {
        Alert.alert("No Purchases Found", "We couldn't find any previous purchases to restore.");
        return false;
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      Alert.alert("Restore Failed", error.message || "Could not restore purchases. Please try again.");
      return false;
    }
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    if (Platform.OS === "web") return;
    
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error("Error refreshing customer info:", error);
    }
  }, []);

  return (
    <RevenueCatContext.Provider
      value={{
        isReady,
        customerInfo,
        currentOffering,
        isPro,
        isTrialing,
        purchasePackage,
        restorePurchases,
        refreshCustomerInfo,
        monthlyPackage,
        annualPackage,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }
  return context;
}
