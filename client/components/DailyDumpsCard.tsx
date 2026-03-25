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
    startHour: 0,
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
    prompt: "Clear your mind for tomorrow.",
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
  const allDone = completedCount === totalVisible;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const handleSlotPress = useCallback((slot: SlotConfig) => {
    if (!completedSlots[slot.key]) {
      onStartDump();
    }
  }, [completedSlots, onStartDump]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <Pressable onPress={toggleExpand} style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: (allDone ? LaneColors.later.primary : LaneColors.soon.primary) + "15" }]}>
          <Feather
            name={allDone ? "check-circle" : "repeat"}
            size={22}
            color={allDone ? LaneColors.later.primary : LaneColors.soon.primary}
          />
        </View>
        <View style={styles.textContainer}>
          <ThemedText type="h4" style={styles.title}>
            Daily Dumps
          </ThemedText>
          <ThemedText type="small" secondary>
            {allDone ? "All done for today" : "Morning, midday, and evening check-ins"}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText type="body" style={{ color: allDone ? LaneColors.later.primary : LaneColors.soon.primary, fontWeight: "600" }}>
            {completedCount}/{totalVisible}
          </ThemedText>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
            style={{ marginLeft: Spacing.xs }}
          />
        </View>
      </Pressable>

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
                    size={16}
                    color={isDone ? LaneColors.later.primary : slot.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText
                    type="body"
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
                  <Feather name="arrow-right" size={16} color={slot.color} />
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
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
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
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
