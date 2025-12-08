import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import WeeklyResetScreen from "@/screens/WeeklyResetScreen";
import LaneTimingsSettingsScreen from "@/screens/LaneTimingsSettingsScreen";
import ModeSettingsScreen from "@/screens/ModeSettingsScreen";
import HowItWorksScreen from "@/screens/HowItWorksScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  WeeklyReset: undefined;
  LaneTimingsSettings: undefined;
  ModeSettings: undefined;
  HowItWorks: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
        }}
      />
      <Stack.Screen
        name="WeeklyReset"
        component={WeeklyResetScreen}
        options={{
          title: "This Week",
        }}
      />
      <Stack.Screen
        name="LaneTimingsSettings"
        component={LaneTimingsSettingsScreen}
        options={{
          title: "Lane Timings",
        }}
      />
      <Stack.Screen
        name="ModeSettings"
        component={ModeSettingsScreen}
        options={{
          title: "Mode",
        }}
      />
      <Stack.Screen
        name="HowItWorks"
        component={HowItWorksScreen}
        options={{
          title: "How It Works",
        }}
      />
    </Stack.Navigator>
  );
}
