import React from "react";
import { StyleSheet, View, ScrollView } from "react-native";
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          <View style={styles.row}>
            <Animated.View
              entering={FadeInUp.delay(0).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="now"
                count={getTasksByLane("now").length}
                onPress={() => handleLanePress("now")}
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(100).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="soon"
                count={getTasksByLane("soon").length}
                onPress={() => handleLanePress("soon")}
              />
            </Animated.View>
          </View>
          <View style={styles.row}>
            <Animated.View
              entering={FadeInUp.delay(200).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="later"
                count={getTasksByLane("later").length}
                onPress={() => handleLanePress("later")}
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(300).duration(400)}
              style={styles.cardWrapper}
            >
              <LaneCard
                lane="park"
                count={getTasksByLane("park").length}
                onPress={() => handleLanePress("park")}
              />
            </Animated.View>
          </View>
        </View>
      </ScrollView>
      <FloatingAddButton onPress={handleAddTask} bottom={tabBarHeight + Spacing.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cardWrapper: {
    flex: 1,
  },
});
