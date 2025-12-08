import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TeamHubScreen from "@/screens/TeamHubScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TeamStackParamList = {
  TeamHub: undefined;
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
    </Stack.Navigator>
  );
}
