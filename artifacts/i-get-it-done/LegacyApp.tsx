import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AchievementUnlockModal } from "@/components/AchievementUnlockModal";
import { TaskStoreProvider } from "@/stores/TaskStore";
import { GamificationProvider } from "@/stores/GamificationStore";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RevenueCatProvider } from "@/contexts/RevenueCatContext";
import { useTheme } from "@/hooks/useTheme";
import {
  registerPushTokenIfNeeded,
  registerWebPushIfNeeded,
  setupNotificationCategories,
  addNotificationResponseListener,
  getInitialNotificationResponse,
  ACTION_MARK_DONE,
  ACTION_START_FOCUS,
  ACTION_SNOOZE,
} from "@/lib/notifications";
import { apiRequest } from "@/lib/query-client";
import { captureReferralFromUrl, subscribeToReferralLinks } from "@/lib/referral";
import { restoreDailyReminders } from "@/components/DailyReminderSettings";

const navigationRef = createNavigationContainerRef();

// Navigates once the navigator is mounted (cold starts deliver the tap first).
function navigateWhenReady(params: object, label: string) {
  let attempts = 0;
  const target = () => {
    if (navigationRef.isReady()) {
      try {
        (navigationRef.navigate as (name: string, params?: object) => void)("Main", params);
      } catch (error) {
        console.log(`${label} navigation failed:`, error);
      }
    } else if (attempts < 40) {
      attempts += 1;
      setTimeout(target, 500);
    } else {
      console.log(`${label} navigation gave up: navigation never became ready`);
    }
  };
  target();
}

function AppContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const lastRegisteredUserId = useRef<string | null>(null);

  useEffect(() => {
    captureReferralFromUrl();
    const subscription = subscribeToReferralLinks();
    return () => subscription.remove();
  }, []);

  const handledResponseIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setupNotificationCategories();

    const handleResponse = async (response: {
      notification: { request: { identifier: string; content: { data: unknown } } };
      actionIdentifier: string;
    }) => {
      // Dedupe: on iOS cold start the same tap can surface both via
      // getLastNotificationResponseAsync and the response listener.
      const responseKey = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handledResponseIds.current.has(responseKey)) return;
      handledResponseIds.current.add(responseKey);

      const data = response.notification.request.content.data as {
        taskId?: string;
        type?: string;
      };
      const action = response.actionIdentifier;

      if (action === ACTION_MARK_DONE && data?.taskId) {
        try {
          await apiRequest("PUT", `/api/tasks/${data.taskId}`, {
            completedAt: new Date().toISOString(),
          });
          queryClient.invalidateQueries();
        } catch (error) {
          console.log("Failed to mark task done from notification:", error);
        }
        return;
      }

      if (action === ACTION_SNOOZE && data?.taskId) {
        try {
          await apiRequest("POST", `/api/tasks/${data.taskId}/snooze`, {});
        } catch (error) {
          console.log("Failed to snooze task from notification:", error);
        }
        return;
      }

      if (action === ACTION_START_FOCUS && data?.taskId) {
        // App is foregrounded by this action; navigate once ready.
        navigateWhenReady(
          { screen: "FocusTab", params: { screen: "FocusTimer", params: { taskId: data.taskId } } },
          "Focus"
        );
        return;
      }

      // Plain taps on Team notifications open the relevant screen.
      if (data?.type === "delegation") {
        navigateWhenReady({ screen: "TeamTab", params: { screen: "DelegatedToMe", initial: false } }, "Assigned to me");
        return;
      }
      if (data?.type === "delegation_update" && data.taskId) {
        navigateWhenReady(
          { screen: "DashboardTab", params: { screen: "TaskDetail", params: { taskId: data.taskId }, initial: false } },
          "Hand-off update"
        );
      }
    };

    const subscription = addNotificationResponseListener(handleResponse);

    // Cold-start path: when the app was fully quit, the tap that launched it
    // is delivered *before* the listener above exists. Fetch it explicitly.
    getInitialNotificationResponse()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch((error) => {
        console.log("Failed to read initial notification response:", error);
      });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      // Signing out detaches this device's push token, so the next sign-in
      // (even to the same account) must register it again.
      lastRegisteredUserId.current = null;
      return;
    }
    if (user.id !== lastRegisteredUserId.current) {
      lastRegisteredUserId.current = user.id;
      registerPushTokenIfNeeded(user.id);
      registerWebPushIfNeeded(user.id);
      restoreDailyReminders(user.id);
    }
  }, [user?.id]);
  
  return (
    <RevenueCatProvider userId={user?.id}>
      <NavigationContainer ref={navigationRef}>
        <RootStackNavigator />
      </NavigationContainer>
      <AchievementUnlockModal />
      <StatusBar style={isDark ? "light" : "dark"} />
    </RevenueCatProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TaskStoreProvider>
              <GamificationProvider>
                <SafeAreaProvider>
                  <GestureHandlerRootView style={styles.root}>
                    <KeyboardProvider>
                      <AppContent />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </SafeAreaProvider>
              </GamificationProvider>
            </TaskStoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
