import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "@/screens/WelcomeScreen";
import LaneSetupScreen from "@/screens/LaneSetupScreen";
import ModeSelectionScreen from "@/screens/ModeSelectionScreen";
import RoutineSetupScreen from "@/screens/RoutineSetupScreen";

export type OnboardingStackParamList = {
  Welcome: undefined;
  LaneSetup: undefined;
  ModeSelection: undefined;
  RoutineSetup: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="LaneSetup" component={LaneSetupScreen} />
      <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
      <Stack.Screen name="RoutineSetup" component={RoutineSetupScreen} />
    </Stack.Navigator>
  );
}
