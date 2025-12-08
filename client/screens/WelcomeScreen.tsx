import React from "react";
import { StyleSheet, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, LaneColors } from "@/constants/theme";
import { OnboardingStackParamList } from "@/navigation/OnboardingStackNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.icon}
            resizeMode="contain"
          />
          <ThemedText type="wordmark" style={styles.wordmark}>
            I GET IT DONE
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.taglineContainer}>
          <ThemedText type="h1" style={styles.tagline}>
            Now. Soon. Done.
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            Sort your tasks into four lanes and watch your productivity soar
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.previewContainer}>
          <View style={styles.lanesPreview}>
            {(["now", "soon", "later", "park"] as const).map((lane, index) => (
              <Animated.View
                key={lane}
                entering={FadeInUp.delay(500 + index * 100).duration(400)}
              >
                <LinearGradient
                  colors={LaneColors[lane].gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lanePreview}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(900).duration(600)}
          style={styles.buttonContainer}
        >
          <Button onPress={() => navigation.navigate("LaneSetup")}>
            Get Started
          </Button>
        </Animated.View>
      </View>
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
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: Spacing.md,
  },
  wordmark: {
    textAlign: "center",
  },
  taglineContainer: {
    alignItems: "center",
  },
  tagline: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    maxWidth: 280,
  },
  previewContainer: {
    alignItems: "center",
  },
  lanesPreview: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  lanePreview: {
    width: 60,
    height: 80,
    borderRadius: 12,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.md,
  },
});
