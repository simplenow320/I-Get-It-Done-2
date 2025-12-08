import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface FAQItem {
  question: string;
  answer: string;
}

const features = [
  {
    icon: "zap" as const,
    title: "Quick Dump",
    description: "Capture ideas fast before you forget them",
    color: LaneColors.now.primary,
  },
  {
    icon: "layers" as const,
    title: "Break It Down",
    description: "Split big tasks into tiny doable steps",
    color: LaneColors.soon.primary,
  },
  {
    icon: "grid" as const,
    title: "4 Lanes",
    description: "Now, Soon, Later, Park - simple organization",
    color: LaneColors.later.primary,
  },
  {
    icon: "play-circle" as const,
    title: "Focus Timer",
    description: "Beat time blindness with sprint sessions",
    color: LaneColors.park.primary,
  },
];

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

export default function HowItWorksScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInUp.duration(300)}>
        <ThemedText type="h2" style={styles.sectionTitle}>
          Key Features
        </ThemedText>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={[styles.featureCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                <Feather name={feature.icon} size={24} color={feature.color} />
              </View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {feature.title}
              </ThemedText>
              <ThemedText type="small" secondary style={styles.featureDescription}>
                {feature.description}
              </ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(300)}>
        <ThemedText type="h2" style={styles.sectionTitle}>
          Frequently Asked Questions
        </ThemedText>
        <View style={styles.faqList}>
          {faqData.map((item, index) => (
            <FAQItemComponent
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  featureCard: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    lineHeight: 18,
  },
  faqList: {
    gap: Spacing.sm,
  },
  faqCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontWeight: "600",
  },
  faqAnswer: {
    lineHeight: 22,
  },
});
