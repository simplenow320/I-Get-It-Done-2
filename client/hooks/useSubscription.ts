import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo } from "react";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  status: "none" | "trialing" | "active" | "past_due" | "canceled";
  trialEndsAt: string | null;
  isActive: boolean;
  isTrialing: boolean;
}

interface SubscriptionResponse {
  subscription: SubscriptionStatus;
}

function calculateTrialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function useSubscription() {
  const { user } = useAuth();

  const query = useQuery<SubscriptionResponse>({
    queryKey: ["/api/subscription", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user?.id) {
        throw new Error("No user ID");
      }
      const response = await fetch(
        new URL(`/api/subscription/${user.id}`, getApiUrl()).toString(),
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      return response.json();
    },
  });

  const subscription = query.data?.subscription;
  
  const trialDaysRemaining = useMemo(() => {
    return calculateTrialDaysRemaining(subscription?.trialEndsAt || null);
  }, [subscription?.trialEndsAt]);

  return {
    subscription,
    isLoading: query.isLoading,
    isError: query.isError,
    isPro: subscription?.isActive || subscription?.isTrialing || false,
    isTrialing: subscription?.isTrialing || false,
    isPastDue: subscription?.status === "past_due",
    isCanceled: subscription?.status === "canceled",
    status: subscription?.status || "none",
    trialDaysRemaining,
    trialEndsAt: subscription?.trialEndsAt || null,
    refetch: query.refetch,
  };
}

export function useSubscriptionWithFocusRefetch() {
  const subscriptionData = useSubscription();

  useFocusEffect(
    useCallback(() => {
      subscriptionData.refetch();
    }, [subscriptionData.refetch])
  );

  return subscriptionData;
}
