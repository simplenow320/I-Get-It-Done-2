import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import FocusModeScreen from "@/screens/FocusModeScreen";
import FocusTimerScreen from "@/screens/FocusTimerScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type FocusStackParamList = {
  FocusMode: undefined;
  FocusTimer: { taskId: string };
};

const Stack = createNativeStackNavigator<FocusStackParamList>();

export default function FocusStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="FocusMode"
        component={FocusModeScreen}
        options={{ headerTitle: "Focus" }}
      />
      <Stack.Screen
        name="FocusTimer"
        component={FocusTimerScreen}
        options={{
          headerTitle: "Focus Timer",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
