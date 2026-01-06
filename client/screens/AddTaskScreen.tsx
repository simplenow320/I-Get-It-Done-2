import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { LaneSelector } from "@/components/LaneSelector";
import VoiceRecorder from "@/components/VoiceRecorder";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { useTaskStore, Lane } from "@/stores/TaskStore";

type RouteParams = {
  AddTask: { defaultLane?: Lane };
};

export default function AddTaskScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "AddTask">>();
  const { addTask } = useTaskStore();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedLane, setSelectedLane] = useState<Lane | null>(route.params?.defaultLane || null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const titleInputRef = useRef<TextInput>(null);

  const isValid = title.trim().length > 0 && selectedLane !== null;

  const handleVoiceTranscription = (text: string) => {
    setVoiceError(null);
    setTitle(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleVoiceError = (error: string) => {
    setVoiceError(error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  useEffect(() => {
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, []);

  const handleAdd = () => {
    if (!isValid || !selectedLane) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask(title.trim(), selectedLane, notes.trim() || undefined);
    navigation.goBack();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Pressable onPress={handleCancel} hitSlop={8}>
          <ThemedText type="body" style={{ color: theme.link }}>
            Cancel
          </ThemedText>
        </Pressable>
        <ThemedText type="h4">New Task</ThemedText>
        <Pressable onPress={handleAdd} disabled={!isValid} hitSlop={8}>
          <ThemedText
            type="body"
            style={{
              color: isValid ? theme.link : theme.textSecondary,
              fontWeight: "600",
            }}
          >
            Add
          </ThemedText>
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            ref={titleInputRef}
            style={[styles.titleInput, { color: theme.text }]}
            placeholder="What needs to be done?"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
            multiline
            maxLength={200}
          />
          <View style={styles.voiceContainer}>
            <VoiceRecorder
              onTranscriptionComplete={handleVoiceTranscription}
              onError={handleVoiceError}
              compact
              userId={user?.id}
            />
          </View>
        </View>
        {voiceError ? (
          <View style={styles.errorContainer}>
            <ThemedText type="small" style={{ color: LaneColors.now.primary }}>
              {voiceError}
            </ThemedText>
          </View>
        ) : null}

        <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault }]}>
          <TextInput
            style={[styles.notesInput, { color: theme.text }]}
            placeholder="Add notes (optional)"
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.laneSelectorContainer}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            When do you want to handle this?
          </ThemedText>
          <LaneSelector selectedLane={selectedLane} onSelectLane={setSelectedLane} />
        </View>

        {selectedLane ? (
          <View style={[styles.laneInfoContainer, { borderColor: LaneColors[selectedLane].primary }]}>
            <Feather
              name={selectedLane === "now" ? "zap" : selectedLane === "soon" ? "clock" : selectedLane === "later" ? "calendar" : "archive"}
              size={20}
              color={LaneColors[selectedLane].primary}
            />
            <View style={styles.laneInfoText}>
              <ThemedText type="small" style={{ textTransform: "capitalize", fontWeight: "600" }}>
                {selectedLane}
              </ThemedText>
              <ThemedText type="caption" secondary>
                {selectedLane === "now" && "Due today"}
                {selectedLane === "soon" && "Due in 2-3 days"}
                {selectedLane === "later" && "Due in 1-2 weeks"}
                {selectedLane === "park" && "Review monthly"}
              </ThemedText>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  inputContainer: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    position: "relative",
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "500",
    minHeight: 60,
    textAlignVertical: "top",
    paddingRight: 50,
  },
  voiceContainer: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
  },
  errorContainer: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  notesInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  laneSelectorContainer: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  laneInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginTop: Spacing.md,
  },
  laneInfoText: {
    flex: 1,
  },
});
