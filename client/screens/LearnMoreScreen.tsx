import React, { useState, useRef } from "react";
import { StyleSheet, View, Pressable, Dimensions, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type RootNavigation = NativeStackNavigationProp<RootStackParamList, "LearnMore">;
type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, "TourLearnMore">;

interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  points: { icon: keyof typeof Feather.glyphMap; text: string }[];
  color: string;
}

const slides: SlideData[] = [
  {
    id: "1",
    title: "Your brain moves fast.",
    subtitle: "We keep up.",
    points: [
      { icon: "zap", text: "Dump ideas quick before you forget" },
      { icon: "layers", text: "Break big stuff into tiny steps" },
      { icon: "check-circle", text: "See progress instantly" },
    ],
    color: LaneColors.now.primary,
  },
  {
    id: "2",
    title: "No more chaos.",
    subtitle: "Just 4 simple lanes.",
    points: [
      { icon: "target", text: "Now - what you're doing today" },
      { icon: "clock", text: "Soon - next few days" },
      { icon: "calendar", text: "Later - this week or next" },
      { icon: "archive", text: "Park - ideas for someday" },
    ],
    color: LaneColors.soon.primary,
  },
  {
    id: "3",
    title: "Built for how you work.",
    subtitle: "Not against it.",
    points: [
      { icon: "play-circle", text: "Focus timer beats time blindness" },
      { icon: "award", text: "Streaks keep you motivated" },
      { icon: "refresh-cw", text: "Weekly reset prevents pile-up" },
      { icon: "users", text: "Hand off tasks when you need help" },
    ],
    color: LaneColors.later.primary,
  },
];

export default function LearnMoreScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<RootNavigation | ProfileNavigation>();
  const route = useRoute();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isTourMode = (route.params as { isTour?: boolean })?.isTour === true;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      if (isTourMode) {
        (navigation as ProfileNavigation).navigate("TourFAQ", { isTour: true });
      } else {
        (navigation as RootNavigation).navigate("FAQ");
      }
    }
  };

  const handleSkip = () => {
    if (isTourMode) {
      (navigation as ProfileNavigation).navigate("TourFAQ", { isTour: true });
    } else {
      (navigation as RootNavigation).navigate("FAQ");
    }
  };

  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.slideContent}>
        <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
          <ThemedText type="h1" style={styles.slideNumber}>{index + 1}</ThemedText>
        </View>
        
        <ThemedText type="h1" style={styles.slideTitle}>
          {item.title}
        </ThemedText>
        <ThemedText type="h3" secondary style={styles.slideSubtitle}>
          {item.subtitle}
        </ThemedText>

        <View style={styles.pointsList}>
          {item.points.map((point, i) => (
            <Animated.View
              key={i}
              entering={FadeInUp.delay(100 + i * 80).duration(400)}
              style={[styles.pointCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.pointIcon, { backgroundColor: `${item.color}20` }]}>
                <Feather name={point.icon} size={20} color={item.color} />
              </View>
              <ThemedText type="body" style={styles.pointText}>
                {point.text}
              </ThemedText>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Pressable onPress={handleSkip}>
          <ThemedText type="body" secondary>Skip</ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? LaneColors.now.primary : theme.border,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: LaneColors.now.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText type="body" style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "See FAQ" : "Next"}
          </ThemedText>
          <Feather name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  slide: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  slideNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  slideTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  slideSubtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  pointsList: {
    width: "100%",
    gap: Spacing.sm,
    maxWidth: 340,
  },
  pointCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  pointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pointText: {
    flex: 1,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
