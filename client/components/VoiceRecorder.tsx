import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Platform, Alert, useColorScheme } from "react-native";
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
  const [audioModulesLoaded, setAudioModulesLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  
  const audioRecorderRef = useRef<any>(null);
  const AudioModuleRef = useRef<any>(null);
  const setAudioModeAsyncRef = useRef<any>(null);
  const FileSystemRef = useRef<any>(null);
  const RecordingPresetsRef = useRef<any>(null);
  const AudioRecorderClassRef = useRef<any>(null);
  
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS !== "web") {
      loadAudioModules();
    }
  }, []);

  const loadAudioModules = async () => {
    try {
      const [audioModule, fileSystemModule] = await Promise.all([
        import("expo-audio"),
        import("expo-file-system/legacy"),
      ]);
      
      AudioModuleRef.current = audioModule.AudioModule;
      setAudioModeAsyncRef.current = audioModule.setAudioModeAsync;
      RecordingPresetsRef.current = audioModule.RecordingPresets;
      AudioRecorderClassRef.current = audioModule.AudioRecorder;
      FileSystemRef.current = fileSystemModule;
      
      setAudioModulesLoaded(true);
      
      try {
        const status = await AudioModuleRef.current.getRecordingPermissionsAsync();
        if (status.granted) {
          setPermissionStatus("granted");
        }
      } catch (permError) {
        console.warn("Permission check error:", permError);
      }
    } catch (error) {
      console.error("Failed to load audio modules:", error);
      setLoadError(true);
    }
  };

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

  const startRecording = async () => {
    if (!audioModulesLoaded || !AudioRecorderClassRef.current) {
      onError?.("Voice not available");
      return;
    }

    try {
      if (permissionStatus !== "granted") {
        const status = await AudioModuleRef.current.requestRecordingPermissionsAsync();
        if (!status.granted) {
          setPermissionStatus("denied");
          onError?.("Tap to allow mic access");
          return;
        }
        setPermissionStatus("granted");
      }

      await setAudioModeAsyncRef.current({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      const recorder = new AudioRecorderClassRef.current();
      await recorder.prepareToRecordAsync(RecordingPresetsRef.current.HIGH_QUALITY);
      await recorder.record();
      audioRecorderRef.current = recorder;
      
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
      const recorder = audioRecorderRef.current;
      if (!recorder) {
        throw new Error("No active recording");
      }
      
      await recorder.stop();
      await setAudioModeAsyncRef.current({
        allowsRecording: false,
      });
      
      const uri = recorder.uri;
      console.log("Recording URI:", uri);

      if (!uri) {
        console.error("No recording URI available");
        onError?.("Recording failed");
        setState("idle");
        return;
      }

      await transcribeAudio(uri);
    } catch (error) {
      console.error("Failed to stop recorder:", error);
      onError?.("Couldn't stop recording");
      setState("idle");
    }
  };

  const transcribeAudio = async (uri: string) => {
    if (!FileSystemRef.current) {
      onError?.("Upload not available");
      setState("idle");
      return;
    }

    try {
      console.log("Starting transcription for:", uri);
      
      const fileInfo = await FileSystemRef.current.getInfoAsync(uri);
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
      
      const response = await FileSystemRef.current.uploadAsync(uploadUrl, uri, {
        fieldName: "audio",
        httpMethod: "POST",
        uploadType: FileSystemRef.current.FileSystemUploadType.MULTIPART,
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

    if (loadError) {
      onError?.("Voice not available on this device");
      return;
    }

    if (!audioModulesLoaded) {
      onError?.("Loading voice...");
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
    if (loadError) return isDark ? "#555555" : "#999999";
    if (state === "recording") return LaneColors.now.primary;
    if (state === "processing") return isDark ? "#888888" : "#666666";
    if (!audioModulesLoaded) return isDark ? "#666666" : "#888888";
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
