import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform } from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  withSpring,
  cancelAnimation 
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceRecorder({ onTranscriptionComplete, onError, compact = false }: VoiceRecorderProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<RecordingState>("idle");
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    checkPermission();
  }, []);

  useEffect(() => {
    if (state === "recording") {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 800 }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withSpring(1);
    }
  }, [state]);

  const checkPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === "granted");
    } catch (error) {
      console.error("Permission check error:", error);
      setPermissionGranted(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setPermissionGranted(false);
        onError?.("Microphone permission required");
        return;
      }
      setPermissionGranted(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.("Failed to start recording");
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      setState("processing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error("No recording URI");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      await transcribeAudio(uri);
    } catch (error) {
      console.error("Failed to stop recording:", error);
      onError?.("Failed to process recording");
      setState("idle");
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      const formData = new FormData();
      
      const filename = uri.split("/").pop() || "recording.m4a";
      formData.append("audio", {
        uri: uri,
        type: "audio/m4a",
        name: filename,
      } as any);

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      
      if (data.text && data.text.trim()) {
        onTranscriptionComplete(data.text.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        onError?.("No speech detected");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      onError?.(error.message || "Failed to transcribe");
    } finally {
      setState("idle");
    }
  };

  const handlePress = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: state === "recording" ? 0.3 : 0,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  if (Platform.OS === "web") {
    return (
      <View style={[styles.webFallback, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name="mic-off" size={18} color={theme.textSecondary} />
        <ThemedText type="small" secondary style={styles.webText}>
          Voice in Expo Go
        </ThemedText>
      </View>
    );
  }

  if (permissionGranted === false) {
    return (
      <Pressable 
        onPress={checkPermission}
        style={[styles.permissionButton, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Feather name="mic-off" size={18} color={theme.textSecondary} />
      </Pressable>
    );
  }

  const isDisabled = state === "processing";
  const buttonColor = state === "recording" 
    ? LaneColors.now.primary 
    : state === "processing"
    ? theme.backgroundSecondary
    : LaneColors.soon.primary;

  const buttonSize = compact ? 44 : 52;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.pulse, 
          { backgroundColor: LaneColors.now.primary, width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }, 
          pulseStyle
        ]} 
      />
      <Animated.View style={buttonStyle}>
        <Pressable
          onPress={handlePress}
          disabled={isDisabled}
          style={[styles.button, { backgroundColor: buttonColor, width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }]}
        >
          {state === "processing" ? (
            <Feather name="loader" size={compact ? 20 : 24} color={theme.textSecondary} />
          ) : state === "recording" ? (
            <Feather name="square" size={compact ? 16 : 20} color="#FFFFFF" />
          ) : (
            <Feather name="mic" size={compact ? 20 : 24} color="#FFFFFF" />
          )}
        </Pressable>
      </Animated.View>
      {!compact && state === "recording" ? (
        <ThemedText type="small" style={styles.stateText}>
          Tap to stop
        </ThemedText>
      ) : !compact && state === "processing" ? (
        <ThemedText type="small" secondary style={styles.stateText}>
          Processing...
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    position: "absolute",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  webFallback: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  webText: {
    flex: 1,
  },
  permissionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
