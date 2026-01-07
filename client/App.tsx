import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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

function AppContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  return (
    <RevenueCatProvider userId={user?.id}>
      <NavigationContainer>
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
