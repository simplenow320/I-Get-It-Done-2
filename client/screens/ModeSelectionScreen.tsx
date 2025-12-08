import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";
import { OnboardingStackParamList } from "@/navigation/OnboardingStackNavigator";

type NavigationProp = NativeStackNavigationProp<OnboardingStackParamList, "ModeSelection">;

type Mode = "solo" | "team";

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ModeCardProps {
  mode: Mode;
  isSelected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
}

function ModeCard({ mode, isSelected, onSelect, title, description, icon }: ModeCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  const borderColor = isSelected ? LaneColors.now.primary : theme.border;
  const backgroundColor = isSelected ? `${LaneColors.now.primary}10` : theme.backgroundDefault;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.modeCard,
        { backgroundColor, borderColor, borderWidth: 2 },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isSelected ? LaneColors.now.primary : theme.backgroundSecondary },
        ]}
      >
        <Feather
          name={icon}
          size={28}
          color={isSelected ? "#FFFFFF" : theme.textSecondary}
        />
      </View>
      <ThemedText type="h2" style={styles.modeTitle}>
        {title}
      </ThemedText>
      <ThemedText type="body" secondary style={styles.modeDescription}>
        {description}
      </ThemedText>
      {isSelected ? (
        <View style={[styles.checkmark, { backgroundColor: LaneColors.now.primary }]}>
          <Feather name="check" size={16} color="#FFFFFF" />
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export default function ModeSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { updateSettings, completeOnboarding } = useTaskStore();
  const [selectedMode, setSelectedMode] = useState<Mode>("solo");

  const handleContinue = () => {
    updateSettings({ mode: selectedMode });
    completeOnboarding();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
            <View style={[styles.progressDot, { backgroundColor: LaneColors.now.primary }]} />
          </View>
          <ThemedText type="h1" style={styles.title}>
            Choose Your Mode
          </ThemedText>
          <ThemedText type="body" secondary style={styles.subtitle}>
            You can change this later in settings
          </ThemedText>
        </View>

        <View style={styles.cardsContainer}>
          <ModeCard
            mode="solo"
            isSelected={selectedMode === "solo"}
            onSelect={() => setSelectedMode("solo")}
            title="Solo"
            description="Personal productivity for just you. Fast, focused, and simple."
            icon="user"
          />
          <ModeCard
            mode="team"
            isSelected={selectedMode === "team"}
            onSelect={() => setSelectedMode("team")}
            title="Team"
            description="Hand off tasks to others. Track progress together."
            icon="users"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button onPress={handleContinue}>Let's Go</Button>
        </View>
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
  header: {},
  progressContainer: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {},
  cardsContainer: {
    flex: 1,
    justifyContent: "center",
    gap: Spacing.md,
  },
  modeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    position: "relative",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modeTitle: {
    marginBottom: Spacing.xs,
  },
  modeDescription: {},
  checkmark: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {},
});
