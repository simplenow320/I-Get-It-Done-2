import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DashboardScreen from "@/screens/DashboardScreen";
import LaneDetailScreen from "@/screens/LaneDetailScreen";
import AddTaskScreen from "@/screens/AddTaskScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Lane } from "@/stores/TaskStore";

export type DashboardStackParamList = {
  Dashboard: undefined;
  LaneDetail: { lane: Lane };
  AddTask: { defaultLane?: Lane } | undefined;
  TaskDetail: { taskId: string };
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const laneLabels: Record<Lane, string> = {
  now: "Now",
  soon: "Soon",
  later: "Later",
  park: "Park",
};

export default function DashboardStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="I GET IT DONE" />,
        }}
      />
      <Stack.Screen
        name="LaneDetail"
        component={LaneDetailScreen}
        options={({ route }) => ({
          headerTitle: laneLabels[route.params.lane],
        })}
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
