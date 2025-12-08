import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, Alert } from "react-native";
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from "expo-audio";
import { File } from "expo-file-system/next";
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

import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { LaneColors } from "@/constants/theme";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceRecorder({ onTranscriptionComplete, onError, compact = false }: VoiceRecorderProps) {
  const { theme } = useTheme();
  const [state, setState] = useState<RecordingState>("idle");
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== "web") {
      checkPermissionOnce();
    }
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

  const checkPermissionOnce = async () => {
    try {
      const status = await AudioModule.getRecordingPermissionsAsync();
      if (status.granted) {
        setPermissionStatus("granted");
      } else if (status.canAskAgain === false) {
        setPermissionStatus("denied");
      }
    } catch (error) {
      console.error("Permission check error:", error);
    }
  };

  const startRecording = async () => {
    try {
      if (permissionStatus !== "granted") {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          setPermissionStatus("denied");
          onError?.("Tap to allow mic access");
          return;
        }
        setPermissionStatus("granted");
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.record();
      setState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error("Failed to start recording:", error);
      onError?.("Couldn't start recording");
    }
  };

  const stopRecording = async () => {
    setState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await audioRecorder.stop();
    } catch (error) {
      console.error("Failed to stop recorder:", error);
      onError?.("Couldn't stop recording");
      setState("idle");
      return;
    }
    
    try {
      await setAudioModeAsync({
        allowsRecording: false,
      });
    } catch (error) {
      console.error("Failed to reset audio mode:", error);
    }
    
    const uri = audioRecorder.uri;
    console.log("Recording URI:", uri);

    if (!uri) {
      console.error("No recording URI available");
      onError?.("Recording failed");
      setState("idle");
      return;
    }

    await transcribeAudio(uri);
  };

  const transcribeAudio = async (uri: string) => {
    try {
      console.log("Starting transcription for:", uri);
      const formData = new FormData();
      
      // Use expo-file-system File class for proper React Native FormData handling
      const file = new File(uri);
      formData.append("audio", file);

      const apiUrl = getApiUrl();
      console.log("Sending to:", `${apiUrl}/api/transcribe`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${apiUrl}/api/transcribe`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Transcription API error:", errorData);
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      console.log("Transcription result:", data);
      
      if (data.text && data.text.trim()) {
        onTranscriptionComplete(data.text.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        onError?.("Didn't catch that");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      if (error.name === 'AbortError') {
        onError?.("Request timed out");
      } else {
        onError?.("Couldn't understand audio");
      }
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

  const handleWebPress = () => {
    onError?.("Use Expo Go for voice");
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
      <Pressable 
        onPress={handleWebPress}
        style={[styles.webButton, { backgroundColor: theme.backgroundSecondary }]}
      >
        <Feather name="mic-off" size={20} color={theme.textSecondary} />
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
  webButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
