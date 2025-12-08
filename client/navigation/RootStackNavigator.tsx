import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingStackNavigator from "@/navigation/OnboardingStackNavigator";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { useTaskStore } from "@/stores/TaskStore";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { settings } = useTaskStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {settings.onboardingComplete ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingStackNavigator} />
      )}
    </Stack.Navigator>
  );
}
