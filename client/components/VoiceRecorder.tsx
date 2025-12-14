import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, Alert, useColorScheme } from "react-native";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
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

import { getApiUrl } from "@/lib/query-client";
import { LaneColors } from "@/constants/theme";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
}

type RecordingState = "idle" | "recording" | "processing";

export default function VoiceRecorder({ onTranscriptionComplete, onError, compact = false }: VoiceRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
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
      } else {
        setPermissionStatus("unknown");
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

      audioRecorder.record();
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
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log("File info:", JSON.stringify(fileInfo));
      
      if (!fileInfo.exists) {
        throw new Error("Recording file not found");
      }
      
      if (fileInfo.size === 0) {
        throw new Error("Recording file is empty");
      }

      const apiUrl = getApiUrl();
      const uploadUrl = `${apiUrl}/api/transcribe`;
      console.log("Uploading to:", uploadUrl);
      
      const response = await FileSystem.uploadAsync(uploadUrl, uri, {
        fieldName: "audio",
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        mimeType: "audio/m4a",
      });
      
      console.log("Response status:", response.status);

      if (response.status !== 200) {
        const errorData = JSON.parse(response.body || "{}");
        console.error("Transcription API error:", errorData);
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = JSON.parse(response.body);
      console.log("Transcription result:", data);
      
      if (data.text && data.text.trim()) {
        onTranscriptionComplete(data.text.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        onError?.("Didn't catch that");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      onError?.("Couldn't understand audio");
    } finally {
      setState("idle");
    }
  };

  const handlePress = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (Platform.OS === "web") {
      Alert.alert(
        "Voice Recording",
        "Voice recording works best in Expo Go. Open the app on your phone to use this feature."
      );
      return;
    }

    if (state === "idle") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: 2 - pulseScale.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const size = compact ? 44 : 56;
  const iconSize = compact ? 20 : 24;

  const getButtonColor = () => {
    if (state === "recording") return LaneColors.now.primary;
    if (state === "processing") return isDark ? "#888888" : "#666666";
    return LaneColors.soon.primary;
  };

  return (
    <View style={styles.container}>
      {state === "recording" ? (
        <Animated.View
          style={[
            styles.pulse,
            pulseStyle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: LaneColors.now.primary,
            },
          ]}
        />
      ) : null}
      
      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={state === "processing"}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getButtonColor(),
            },
          ]}
        >
          {state === "processing" ? (
            <Animated.View
              style={[
                styles.processingDot,
                {
                  backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF",
                },
              ]}
            />
          ) : (
            <Feather
              name={state === "recording" ? "square" : "mic"}
              size={iconSize}
              color="#FFFFFF"
            />
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
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
