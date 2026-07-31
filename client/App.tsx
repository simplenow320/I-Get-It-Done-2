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
  setupNotificationCategories,
  addNotificationResponseListener,
  ACTION_MARK_DONE,
  ACTION_START_FOCUS,
  ACTION_SNOOZE,
} from "@/lib/notifications";
import { apiRequest } from "@/lib/query-client";
import { captureReferralFromUrl, subscribeToReferralLinks } from "@/lib/referral";

const navigationRef = createNavigationContainerRef();

function AppContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const lastRegisteredUserId = useRef<string | null>(null);

  useEffect(() => {
    captureReferralFromUrl();
    const subscription = subscribeToReferralLinks();
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setupNotificationCategories();

    const subscription = addNotificationResponseListener(async (response) => {
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
        const target = () => {
          if (navigationRef.isReady()) {
            try {
              (navigationRef.navigate as (name: string, params?: object) => void)("Main", {
                screen: "FocusTab",
                params: { screen: "FocusTimer", params: { taskId: data.taskId } },
              });
            } catch (error) {
              console.log("Focus navigation failed:", error);
            }
          } else {
            setTimeout(target, 500);
          }
        };
        target();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (user?.id && user.id !== lastRegisteredUserId.current) {
      lastRegisteredUserId.current = user.id;
      registerPushTokenIfNeeded(user.id);
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
