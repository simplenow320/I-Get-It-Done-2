import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeInUp } from "react-native-reanimated";

import { LaneCard } from "@/components/LaneCard";
import { FloatingAddButton } from "@/components/FloatingAddButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";
import { DashboardStackParamList } from "@/navigation/DashboardStackNavigator";

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, "Dashboard">;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { getTasksByLane } = useTaskStore();

  const lanes: Lane[] = ["now", "soon", "later", "park"];

  const handleLanePress = (lane: Lane) => {
    navigation.navigate("LaneDetail", { lane });
  };

  const handleAddTask = () => {
    navigation.navigate("AddTask");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View style={styles.grid}>
          {lanes.map((lane, index) => (
            <Animated.View
              key={lane}
              entering={FadeInUp.delay(index * 100).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane={lane}
                count={getTasksByLane(lane).length}
                onPress={() => handleLanePress(lane)}
              />
            </Animated.View>
          ))}
        </View>
      </View>
      <FloatingAddButton onPress={handleAddTask} bottom={tabBarHeight + Spacing.xl} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: "48%",
  },
});
