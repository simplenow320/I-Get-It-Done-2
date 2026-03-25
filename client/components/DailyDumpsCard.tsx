import React, { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Pressable, LayoutAnimation, Platform, UIManager } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore } from "@/stores/TaskStore";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DumpSlot = "morning" | "midday" | "evening";

interface SlotConfig {
  key: DumpSlot;
  label: string;
  prompt: string;
  startHour: number;
  endHour: number;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}

const SLOTS: SlotConfig[] = [
  {
    key: "morning",
    label: "Morning Dump",
    prompt: "Start your day. What needs your attention?",
    startHour: 5,
    endHour: 12,
    icon: "sunrise",
    color: LaneColors.soon.primary,
  },
  {
    key: "midday",
    label: "Midday Reset",
    prompt: "Quick reset. What's still on your plate?",
    startHour: 12,
    endHour: 17,
    icon: "sun",
    color: LaneColors.later.primary,
  },
  {
    key: "evening",
    label: "Evening Dump",
    prompt: "Wrap your day. Clear your mind for tomorrow.",
    startHour: 17,
    endHour: 24,
    icon: "moon",
    color: LaneColors.park.primary,
  },
];

function getCurrentSlot(): DumpSlot | null {
  const hour = new Date().getHours();
  for (const slot of SLOTS) {
    if (hour >= slot.startHour && hour < slot.endHour) return slot.key;
  }
  return null;
}

interface DailyDumpsCardProps {
  onStartDump: () => void;
}

export default function DailyDumpsCard({ onStartDump }: DailyDumpsCardProps) {
  const { theme } = useTheme();
  const { tasks } = useTaskStore();
  const [expanded, setExpanded] = useState(false);

  const currentSlot = getCurrentSlot();

  const completedSlots = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: Record<DumpSlot, boolean> = {
      morning: false,
      midday: false,
      evening: false,
    };

    for (const task of tasks) {
      if (!task.createdAt) continue;
      const created = new Date(task.createdAt);
      const createdDay = new Date(created);
      createdDay.setHours(0, 0, 0, 0);
      if (createdDay.getTime() !== today.getTime()) continue;

      const hour = created.getHours();
      for (const slot of SLOTS) {
        if (hour >= slot.startHour && hour < slot.endHour) {
          result[slot.key] = true;
        }
      }
    }

    return result;
  }, [tasks]);

  const completedCount = Object.values(completedSlots).filter(Boolean).length;
  const totalVisible = SLOTS.length;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleSlotPress = useCallback((slot: SlotConfig) => {
    if (!completedSlots[slot.key]) {
      onStartDump();
    }
  }, [completedSlots, onStartDump]);

  const nextIncomplete = useMemo(() => {
    if (currentSlot && !completedSlots[currentSlot]) {
      return SLOTS.find((s) => s.key === currentSlot) || null;
    }
    return SLOTS.find((s) => !completedSlots[s.key]) || null;
  }, [currentSlot, completedSlots]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <Pressable onPress={toggleExpand} style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="repeat" size={14} color={LaneColors.soon.primary} />
          <ThemedText type="caption" style={{ color: LaneColors.soon.primary, fontWeight: "600", marginLeft: Spacing.xs }}>
            Daily Dumps
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText type="caption" secondary>
            {completedCount}/{totalVisible}
          </ThemedText>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textSecondary}
            style={{ marginLeft: Spacing.xs }}
          />
        </View>
      </Pressable>

      {!expanded && nextIncomplete ? (
        <Pressable
          onPress={() => handleSlotPress(nextIncomplete)}
          style={[styles.collapsedPrompt, { borderTopColor: theme.border }]}
        >
          <Feather name={nextIncomplete.icon} size={14} color={nextIncomplete.color} />
          <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm }}>
            {nextIncomplete.prompt}
          </ThemedText>
          <Feather name="arrow-right" size={14} color={nextIncomplete.color} />
        </Pressable>
      ) : !expanded && !nextIncomplete ? (
        <View style={[styles.collapsedPrompt, { borderTopColor: theme.border }]}>
          <Feather name="check-circle" size={14} color={LaneColors.later.primary} />
          <ThemedText type="small" secondary style={{ marginLeft: Spacing.sm }}>
            All dumps done for today
          </ThemedText>
        </View>
      ) : null}

      {expanded ? (
        <View style={[styles.slotsContainer, { borderTopColor: theme.border }]}>
          {SLOTS.map((slot, index) => {
            const isDone = completedSlots[slot.key];
            const isCurrent = currentSlot === slot.key;
            return (
              <Pressable
                key={slot.key}
                onPress={() => handleSlotPress(slot)}
                style={({ pressed }) => [
                  styles.slotRow,
                  index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border } : undefined,
                  pressed && !isDone ? { opacity: 0.7 } : undefined,
                ]}
              >
                <View style={[styles.slotIcon, { backgroundColor: (isDone ? LaneColors.later.primary : slot.color) + "15" }]}>
                  <Feather
                    name={isDone ? "check" : slot.icon}
                    size={14}
                    color={isDone ? LaneColors.later.primary : slot.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="small"
                    style={[
                      { fontWeight: "500" },
                      isDone ? { textDecorationLine: "line-through", opacity: 0.5 } : undefined,
                    ]}
                  >
                    {slot.label}
                    {isCurrent && !isDone ? "  (now)" : ""}
                  </ThemedText>
                  {!isDone ? (
                    <ThemedText type="caption" secondary>
                      {slot.prompt}
                    </ThemedText>
                  ) : (
                    <ThemedText type="caption" secondary style={{ opacity: 0.5 }}>
                      Done
                    </ThemedText>
                  )}
                </View>
                {!isDone ? (
                  <Feather name="arrow-right" size={14} color={slot.color} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  collapsedPrompt: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slotsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  slotIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
