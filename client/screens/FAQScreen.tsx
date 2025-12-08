import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type RootNavigation = NativeStackNavigationProp<RootStackParamList, "FAQ">;
type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, "TourFAQ">;

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "What is Quick Dump?",
    answer: "A fast way to get ideas out of your head. Type or speak your thoughts before you forget them. No organizing needed. Just dump and sort later.",
  },
  {
    question: "What does Break It Down do?",
    answer: "Big tasks feel impossible. This feature splits them into tiny steps. Each small step gives your brain a win. More wins = more motivation to keep going.",
  },
  {
    question: "How does the 4-Lane System help?",
    answer: "Your brain gets overwhelmed by long lists. Four lanes keeps it simple: Now (today), Soon (next few days), Later (this week), Park (someday). No confusion. No stress.",
  },
  {
    question: "Why is there a Focus Timer?",
    answer: "Time blindness is real. You sit down to work and suddenly 3 hours are gone. The timer keeps you aware of time and gives you short bursts to stay focused.",
  },
  {
    question: "What are Streaks for?",
    answer: "Your brain needs rewards to stay motivated. Streaks track your wins. Seeing that number go up gives you a dopamine boost to keep the momentum going.",
  },
  {
    question: "What is Weekly Reset?",
    answer: "Stuff piles up. Weekly Reset shows what you finished, what moved, and what needs attention. It prevents chaos and helps you start each week fresh.",
  },
  {
    question: "How does Hand-Off work?",
    answer: "Some tasks need other people. Hand-Off lets you assign tasks to teammates and track progress. Less stuff on your plate = less overwhelm.",
  },
  {
    question: "Is this app only for people with ADHD?",
    answer: "Nope. If you struggle to start tasks, finish projects, or stay organized - this app is for you. Diagnosed or not, every feature was built for brains that need things simple.",
  },
];

function FAQItemComponent({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onToggle}>
      <View style={[styles.faqCard, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.faqHeader}>
          <ThemedText type="body" style={styles.faqQuestion}>
            {item.question}
          </ThemedText>
          <Feather
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </View>
        {isOpen ? (
          <ThemedText type="body" secondary style={styles.faqAnswer}>
            {item.answer}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<RootNavigation | ProfileNavigation>();
  const route = useRoute();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const isTourMode = (route.params as { isTour?: boolean })?.isTour === true;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleGetStarted = () => {
    if (isTourMode) {
      (navigation as ProfileNavigation).navigate("Profile");
    } else {
      (navigation as RootNavigation).navigate("Onboarding");
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <ThemedText type="h3">FAQ</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.intro}>
          <ThemedText type="h2" style={styles.introTitle}>
            How each feature helps you get stuff done
          </ThemedText>
          <ThemedText type="body" secondary style={styles.introSubtitle}>
            Every feature is backed by research on how ADHD and busy brains actually work.
          </ThemedText>
        </Animated.View>

        <View style={styles.faqList}>
          {faqData.map((item, index) => (
            <Animated.View key={index} entering={FadeInUp.delay(100 + index * 50).duration(300)}>
              <FAQItemComponent
                item={item}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={handleGetStarted}
          style={({ pressed }) => [
            styles.ctaButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <LinearGradient
            colors={LaneColors.now.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <ThemedText type="body" style={styles.ctaText}>
              {isTourMode ? "Back to Profile" : "Ready? Let's Go!"}
            </ThemedText>
            <Feather name={isTourMode ? "arrow-left" : "arrow-right"} size={20} color="#FFFFFF" />
          </LinearGradient>
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
    width: 40,
    padding: Spacing.xs,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  intro: {
    marginBottom: Spacing.lg,
  },
  introTitle: {
    marginBottom: Spacing.sm,
  },
  introSubtitle: {
    lineHeight: 22,
  },
  faqList: {
    gap: Spacing.sm,
  },
  faqCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
    fontWeight: "600",
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  ctaButton: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.xl,
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
});
