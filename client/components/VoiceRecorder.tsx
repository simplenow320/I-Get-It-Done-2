import React, { useState, useEffect } from "react";
import { StyleSheet, View, Pressable, Platform, Alert } from "react-native";
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from "expo-audio";
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

  const findActualRecordingFile = async (originalUri: string): Promise<string | null> => {
    try {
      // Extract the ExpoAudio directory from the original URI
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return null;
      
      const expoAudioDir = cacheDir + "ExpoAudio/";
      console.log("Searching for recordings in:", expoAudioDir);
      
      // Check if directory exists
      const dirInfo = await FileSystem.getInfoAsync(expoAudioDir);
      if (!dirInfo.exists) {
        console.log("ExpoAudio directory does not exist");
        return null;
      }
      
      // Read all files in the directory
      const files = await FileSystem.readDirectoryAsync(expoAudioDir);
      console.log("Files in ExpoAudio:", files);
      
      // Find the most recent non-zero file
      let latestFile: string | null = null;
      let latestTime = 0;
      
      for (const file of files) {
        if (!file.endsWith(".m4a")) continue;
        
        const filePath = expoAudioDir + file;
        const info = await FileSystem.getInfoAsync(filePath);
        
        if (info.exists && info.size && info.size > 0) {
          const modTime = info.modificationTime || 0;
          if (modTime > latestTime) {
            latestTime = modTime;
            latestFile = filePath;
          }
        }
      }
      
      if (latestFile) {
        console.log("Found actual recording file:", latestFile);
      }
      return latestFile;
    } catch (error) {
      console.error("Error finding recording file:", error);
      return null;
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      console.log("Starting transcription for:", uri);
      
      // First check if the original URI works
      let actualUri = uri;
      const originalInfo = await FileSystem.getInfoAsync(uri);
      
      if (!originalInfo.exists || !originalInfo.size || originalInfo.size === 0) {
        console.log("Original URI not accessible, searching for actual file...");
        const foundUri = await findActualRecordingFile(uri);
        if (!foundUri) {
          throw new Error("Could not find recording file");
        }
        actualUri = foundUri;
      }
      
      console.log("Using recording URI:", actualUri);
      
      // Verify file has content
      const fileInfo = await FileSystem.getInfoAsync(actualUri);
      console.log("File info:", JSON.stringify(fileInfo));
      
      if (!fileInfo.exists || !fileInfo.size || fileInfo.size === 0) {
        throw new Error("Recording file not found or empty");
      }

      const apiUrl = getApiUrl();
      const uploadUrl = `${apiUrl}/api/transcribe`;
      console.log("Uploading to:", uploadUrl);
      
      // Use FileSystem.uploadAsync for reliable file uploads on iOS/Android
      const response = await FileSystem.uploadAsync(uploadUrl, actualUri, {
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
