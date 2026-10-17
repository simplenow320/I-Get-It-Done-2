import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import NowScreen from "@/screens/NowScreen";
import AddTaskScreen from "@/screens/AddTaskScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Lane } from "@/stores/TaskStore";

export type NowStackParamList = {
  Now: undefined;
  AddTask: { defaultLane?: Lane } | undefined;
  TaskDetail: { taskId: string };
};

const Stack = createNativeStackNavigator<NowStackParamList>();

export default function NowStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Now"
        component={NowScreen}
        options={{
          headerTitle: "Today",
        }}
      />
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
