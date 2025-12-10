import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TeamHubScreen from "@/screens/TeamHubScreen";
import DelegatedToMeScreen from "@/screens/DelegatedToMeScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TeamStackParamList = {
  TeamHub: undefined;
  DelegatedToMe: undefined;
};

const Stack = createNativeStackNavigator<TeamStackParamList>();

export default function TeamStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TeamHub"
        component={TeamHubScreen}
        options={{ headerTitle: "Team" }}
      />
      <Stack.Screen
        name="DelegatedToMe"
        component={DelegatedToMeScreen}
        options={{ headerTitle: "Assigned to Me" }}
      />
    </Stack.Navigator>
  );
}
