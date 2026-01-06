import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  status: "none" | "trialing" | "active" | "past_due" | "canceled";
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  isActive: boolean;
  isTrialing: boolean;
}

interface SubscriptionResponse {
  subscription: SubscriptionStatus;
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

  return {
    subscription,
    isLoading: query.isLoading,
    isError: query.isError,
    isPro: subscription?.isActive || subscription?.isTrialing || false,
    isTrialing: subscription?.isTrialing || false,
    status: subscription?.status || "none",
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
