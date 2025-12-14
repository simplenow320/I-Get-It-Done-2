import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import WeeklyResetScreen from "@/screens/WeeklyResetScreen";
import LaneTimingsSettingsScreen from "@/screens/LaneTimingsSettingsScreen";
import ModeSettingsScreen from "@/screens/ModeSettingsScreen";
import HowItWorksScreen from "@/screens/HowItWorksScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import SupportScreen from "@/screens/SupportScreen";
import LandingScreen from "@/screens/LandingScreen";
import LearnMoreScreen from "@/screens/LearnMoreScreen";
import FAQScreen from "@/screens/FAQScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  WeeklyReset: undefined;
  LaneTimingsSettings: undefined;
  ModeSettings: undefined;
  HowItWorks: undefined;
  ChangePassword: undefined;
  Support: undefined;
  TourLanding: { isTour: boolean };
  TourLearnMore: { isTour: boolean };
  TourFAQ: { isTour: boolean };
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
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          title: "Change Password",
        }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{
          title: "Support",
        }}
      />
      <Stack.Screen
        name="TourLanding"
        component={LandingScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="TourLearnMore"
        component={LearnMoreScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="TourFAQ"
        component={FAQScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
