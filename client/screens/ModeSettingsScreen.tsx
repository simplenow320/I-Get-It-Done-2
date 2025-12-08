import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function ModeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { settings, updateSettings } = useTaskStore();
  const [selectedMode, setSelectedMode] = useState<Mode>(settings.mode);

  const handleSave = () => {
    updateSettings({ mode: selectedMode });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + 120 },
        ]}
      >
        <ThemedText type="body" secondary style={styles.description}>
          Choose how you want to work
        </ThemedText>

        <View style={styles.cardsContainer}>
          <ModeCard
            mode="solo"
            isSelected={selectedMode === "solo"}
            onSelect={() => setSelectedMode("solo")}
            title="Solo"
            description="Just you. Focus on your tasks without distractions."
            icon="user"
          />
          <ModeCard
            mode="team"
            isSelected={selectedMode === "team"}
            onSelect={() => setSelectedMode("team")}
            title="Team"
            description="Work with others. Hand off tasks and collaborate."
            icon="users"
          />
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Button title="Save Changes" onPress={handleSave} />
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
    gap: Spacing.lg,
  },
  description: {
    textAlign: "center",
  },
  cardsContainer: {
    gap: Spacing.md,
  },
  modeCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modeTitle: {
    marginBottom: Spacing.xs,
  },
  modeDescription: {
    textAlign: "center",
  },
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
});
