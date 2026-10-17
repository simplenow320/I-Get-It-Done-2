import React, { useCallback, useState } from "react";
import { StyleSheet, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import Confetti from "@/components/Confetti";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useTaskStore, Task, Lane } from "@/stores/TaskStore";
import { useGamification } from "@/stores/GamificationStore";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, "LaneDetail">;
type RouteType = RouteProp<DashboardStackParamList, "LaneDetail">;

const laneLabels: Record<Lane, string> = {
  now: "Now",
  soon: "Soon",
  later: "Later",
  park: "Park",
};

const emptyMessages: Record<Lane, { title: string; message: string }> = {
  now: { title: "All Clear", message: "No tasks for today. Time to relax or add something new." },
  soon: { title: "Nothing Soon", message: "Your upcoming tasks will appear here." },
  later: { title: "Future is Open", message: "Plan ahead by adding tasks for later." },
  park: { title: "Park is Empty", message: "Great ideas and low-priority items go here." },
};

export default function LaneDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { lane } = route.params;
  const { getTasksByLane, completeTask } = useTaskStore();
  const { recordTaskComplete } = useGamification();
  const [showConfetti, setShowConfetti] = useState(false);

  const tasks = getTasksByLane(lane);
  const empty = emptyMessages[lane];

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate("TaskDetail", { taskId: task.id });
  }, [navigation]);

  const handleComplete = useCallback((task: Task) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const hasSubtasks = (task.subtasks?.length || 0) > 0;
    const subtaskCount = task.subtasks?.length || 0;
    completeTask(task.id);
    recordTaskComplete(hasSubtasks, subtaskCount);
    setShowConfetti(true);
  }, [completeTask, recordTaskComplete]);

  const handleAddTask = () => {
    navigation.navigate("AddTask", { defaultLane: lane });
  };

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard
        task={item}
        onComplete={() => handleComplete(item)}
        onPress={() => handleTaskPress(item)}
      />
    ),
    [handleComplete, handleTaskPress]
  );

  const renderEmpty = () => (
    <EmptyState lane={lane} title={empty.title} message={empty.message} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={tasks}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
      <FloatingAddButton onPress={handleAddTask} bottom={tabBarHeight + Spacing.xl} />
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} count={30} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
});
