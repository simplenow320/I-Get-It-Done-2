import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import OnboardingStackNavigator from "@/navigation/OnboardingStackNavigator";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import LandingScreen from "@/screens/LandingScreen";
import LearnMoreScreen from "@/screens/LearnMoreScreen";
import FAQScreen from "@/screens/FAQScreen";
import { useTaskStore } from "@/stores/TaskStore";

export type RootStackParamList = {
  Landing: undefined;
  LearnMore: undefined;
  FAQ: undefined;
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
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="LearnMore" component={LearnMoreScreen} />
          <Stack.Screen name="FAQ" component={FAQScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingStackNavigator} />
        </>
      )}
    </Stack.Navigator>
  );
}
