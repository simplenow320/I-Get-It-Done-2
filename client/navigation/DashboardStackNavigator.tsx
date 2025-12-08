import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import DashboardScreen from "@/screens/DashboardScreen";
import LaneDetailScreen from "@/screens/LaneDetailScreen";
import AddTaskScreen from "@/screens/AddTaskScreen";
import TaskDetailScreen from "@/screens/TaskDetailScreen";
import QuickDumpScreen from "@/screens/QuickDumpScreen";
import LandingScreen from "@/screens/LandingScreen";
import LearnMoreScreen from "@/screens/LearnMoreScreen";
import FAQScreen from "@/screens/FAQScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";
import { Lane } from "@/stores/TaskStore";

export type DashboardStackParamList = {
  Dashboard: undefined;
  LaneDetail: { lane: Lane };
  AddTask: { defaultLane?: Lane } | undefined;
  TaskDetail: { taskId: string };
  QuickDump: undefined;
  TourLanding: { isTour: boolean };
  TourLearnMore: { isTour: boolean };
  TourFAQ: { isTour: boolean };
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
  const { theme } = useTheme();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          headerTitle: () => <HeaderTitle title="I GET IT DONE" />,
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate("TourLanding", { isTour: true })}
              hitSlop={12}
              style={{ marginRight: 4 }}
            >
              <Feather name="info" size={22} color={theme.text} />
            </Pressable>
          ),
        })}
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
      <Stack.Screen
        name="QuickDump"
        component={QuickDumpScreen}
        options={{
          headerTitle: "Quick Dump",
          presentation: "modal",
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
