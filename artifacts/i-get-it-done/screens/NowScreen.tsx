import React, { useCallback } from "react";
import { StyleSheet, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";

import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useTaskStore, Task } from "@/stores/TaskStore";
import { NowStackParamList } from "@/navigation/NowStackNavigator";

type NavigationProp = NativeStackNavigationProp<NowStackParamList, "Now">;

export default function NowScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getTasksByLane, completeTask } = useTaskStore();

  const tasks = getTasksByLane("now");

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate("TaskDetail", { taskId: task.id });
  }, [navigation]);

  const handleComplete = useCallback((id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeTask(id);
  }, [completeTask]);

  const handleAddTask = () => {
    navigation.navigate("AddTask", { defaultLane: "now" });
  };

  const handleCompleteAll = () => {
    tasks.forEach((task) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      completeTask(task.id);
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard
        task={item}
        onComplete={() => handleComplete(item.id)}
        onPress={() => handleTaskPress(item)}
      />
    ),
    [handleComplete, handleTaskPress]
  );

  const renderEmpty = () => (
    <EmptyState
      lane="now"
      title="All Clear"
      message="No tasks for today. Add a new task or check your Soon lane."
    />
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
            paddingBottom: tabBarHeight + (tasks.length > 3 ? 100 : Spacing.xl),
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
      {tasks.length > 3 ? (
        <View
          style={[
            styles.completeAllContainer,
            { bottom: tabBarHeight + Spacing.md, backgroundColor: theme.backgroundRoot },
          ]}
        >
          <Button onPress={handleCompleteAll}>Complete All</Button>
        </View>
      ) : null}
      <FloatingAddButton onPress={handleAddTask} bottom={tabBarHeight + Spacing.xl} />
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
  completeAllContainer: {
    position: "absolute",
    left: Spacing.lg,
    right: 100,
    paddingVertical: Spacing.sm,
  },
});
