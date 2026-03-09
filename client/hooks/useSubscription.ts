import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { getApiUrl } from "@/lib/query-client";
import { useAuth, getStoredAuthToken, handleExpiredSession } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  status: "none" | "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
  isActive: boolean;
  isTrialing: boolean;
  lifetimeTasksCreated: number;
  freeTrialActive: boolean;
  freeTasksRemaining: number;
}

interface SubscriptionResponse {
  subscription: SubscriptionStatus;
}

const DEFAULT_SUBSCRIPTION_RESPONSE: SubscriptionResponse = {
  subscription: {
    status: "none",
    trialEndsAt: null,
    isActive: false,
    isTrialing: false,
    lifetimeTasksCreated: 0,
    freeTrialActive: false,
    freeTasksRemaining: 0,
  },
};

let sessionExpiredHandled = false;

function calculateTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function resetSessionExpiredFlag() {
  sessionExpiredHandled = false;
}

export function useSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      sessionExpiredHandled = false;
    }
  }, [user?.id]);

  const query = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("No user ID");
      }
      const token = await getStoredAuthToken();
      if (!token) {
        return DEFAULT_SUBSCRIPTION_RESPONSE;
      }
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      const response = await fetch(
        new URL(`/api/subscription/${user.id}`, getApiUrl()).toString(),
        { credentials: "include", headers }
      );
      if (response.status === 401) {
        if (!sessionExpiredHandled) {
          sessionExpiredHandled = true;
          console.log("[useSubscription] Token expired, handling session expiry");
          handleExpiredSession();
        }
        return DEFAULT_SUBSCRIPTION_RESPONSE;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      sessionExpiredHandled = false;
      return response.json();
    },
  });

  const subscription = query.data?.subscription;
  
  const trialDaysRemaining = useMemo(() => {
    return calculateTrialDaysRemaining(subscription?.trialEndsAt || null);
  }, [subscription?.trialEndsAt]);

  const freeTrialActive = subscription?.freeTrialActive || false;
  const freeTasksRemaining = subscription?.freeTasksRemaining || 0;
  const lifetimeTasksCreated = subscription?.lifetimeTasksCreated || 0;

  const isPaidPro = subscription?.isActive || subscription?.isTrialing || false;
  const hasProFeatures = isPaidPro || freeTrialActive;

  return {
    subscription,
    isLoading: query.isLoading,
    isError: query.isError,
    isPro: isPaidPro,
    hasProFeatures,
    isTrialing: subscription?.isTrialing || false,
    isPastDue: subscription?.status === "past_due",
    isCanceled: subscription?.status === "canceled",
    status: subscription?.status || "none",
    trialDaysRemaining,
    trialEndsAt: subscription?.trialEndsAt || null,
    freeTrialActive,
    freeTasksRemaining,
    lifetimeTasksCreated,
    refetch: query.refetch,
  };
}

export function useSubscriptionWithFocusRefetch() {
  const subscriptionData = useSubscription();
  const lastFetchTime = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchTime.current > 60000) {
        lastFetchTime.current = now;
        subscriptionData.refetch();
      }
    }, [subscriptionData.refetch])
  );

  return subscriptionData;
}
