import React, { useState, useEffect, useRef, useCallback } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { uploadAsync, getInfoAsync, FileSystemUploadType } from "expo-file-system/legacy";

import { getApiUrl } from "@/lib/query-client";
import { getStoredAuthToken } from "@/contexts/AuthContext";
import { LaneColors, Spacing } from "@/constants/theme";
import { ConsentDisclosure } from "./ConsentDisclosure";
import { ThemedText } from "./ThemedText";

const MIC_CONSENT_KEY = "microphone_consent_shown";
const MIC_CONSENT_DECLINED_KEY = "microphone_consent_declined";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  compact?: boolean;
  userId?: string;
  showQuota?: boolean;
}

type RecordingState = "idle" | "recording" | "processing";

const DAILY_LIMIT_SECONDS = 600;

export default function VoiceRecorder({ onTranscriptionComplete, onError, compact = false, userId, showQuota = false }: VoiceRecorderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [state, setState] = useState<RecordingState>("idle");
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied">("unknown");
  const [audioReady, setAudioReady] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(DAILY_LIMIT_SECONDS);
  const [showConsentDisclosure, setShowConsentDisclosure] = useState(false);
  const [consentDeclined, setConsentDeclined] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const lastRecordingUriRef = useRef<string | null>(null);
  const lastRecordingDurationRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const recordingStartTimeRef = useRef<number>(0);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  
  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (userId) {
      checkVoiceUsage();
    }
  }, [userId]);

  const checkVoiceUsage = async () => {
    if (!userId) return;
    try {
      const apiUrl = getApiUrl();
      const authToken = await getStoredAuthToken();
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const response = await fetch(`${apiUrl}/api/voice-usage/${userId}`, {
        headers,
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.secondsRemaining === "number") {
          setSecondsRemaining(data.secondsRemaining);
        }
        if (typeof data.limitReached === "boolean") {
          setLimitReached(data.limitReached);
        }
        setQuotaLoaded(true);
      }
    } catch (error) {
      console.error("Failed to check voice usage:", error);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    if (Platform.OS !== "web") {
      initializeAudio();
      checkPriorConsent();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const initializeAudio = async () => {
    try {
      const status = await AudioModule.getRecordingPermissionsAsync();
      if (isMountedRef.current) {
        if (status.granted) {
          setPermissionStatus("granted");
        }
        setAudioReady(true);
      }
    } catch (error) {
      console.error("Failed to initialize audio:", error);
      if (isMountedRef.current) {
        setAudioReady(true);
      }
    }
  };

  const checkPriorConsent = async () => {
    try {
      const declined = await AsyncStorage.getItem(MIC_CONSENT_DECLINED_KEY);
      if (declined === "true" && isMountedRef.current) {
        setConsentDeclined(true);
      }
    } catch (e) {
      console.warn("Failed to check prior consent:", e);
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

  const checkConsentAndStart = async () => {
    if (!audioReady) {
      onError?.("Loading voice... try again");
      return;
    }

    if (limitReached) {
      onError?.("Daily voice limit reached");
      return;
    }
    
    if (consentDeclined) {
      Alert.alert(
        "Voice Capture Disabled",
        "You previously declined voice capture. Would you like to enable it now?",
        [
          { text: "Not Now", style: "cancel" },
          { 
            text: "Enable", 
            onPress: async () => {
              await AsyncStorage.removeItem(MIC_CONSENT_DECLINED_KEY);
              setConsentDeclined(false);
              setShowConsentDisclosure(true);
            }
          }
        ]
      );
      return;
    }

    if (permissionStatus === "granted") {
      await actuallyStartRecording();
      return;
    }

    if (Platform.OS !== "web") {
      const consentShown = await AsyncStorage.getItem(MIC_CONSENT_KEY);
      if (!consentShown) {
        setShowConsentDisclosure(true);
        return;
      }
    }
    
    await requestPermissionAndStart();
  };

  const requestPermissionAndStart = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!isMountedRef.current) return;
      if (!status.granted) {
        setPermissionStatus("denied");
        onError?.("Tap to allow mic access");
        return;
      }
      setPermissionStatus("granted");
      await actuallyStartRecording();
    } catch (error) {
      console.error("Permission request failed:", error);
      onError?.("Couldn't request microphone permission");
    }
  };

  const handleConsentAccept = async () => {
    setShowConsentDisclosure(false);
    await AsyncStorage.setItem(MIC_CONSENT_KEY, "true");
    await requestPermissionAndStart();
  };

  const handleConsentDecline = async () => {
    setShowConsentDisclosure(false);
    setConsentDeclined(true);
    await AsyncStorage.setItem(MIC_CONSENT_DECLINED_KEY, "true");
    onError?.("Voice capture declined");
  };

  const actuallyStartRecording = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      recordingStartTimeRef.current = Date.now();
      audioRecorder.record();
      
      if (!isMountedRef.current) {
        try { await audioRecorder.stop(); } catch (e) {}
        return;
      }
      
      setState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      if (isMountedRef.current) {
        const message = error?.message?.includes("permission") 
          ? "Microphone permission required" 
          : "Couldn't start recording";
        onError?.(message);
      }
    }
  };

  const stopRecording = async () => {
    if (!isMountedRef.current) return;
    
    setState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const durationSeconds = Math.ceil((Date.now() - recordingStartTimeRef.current) / 1000);

    try {
      await audioRecorder.stop();
      
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });
      
      const uri = audioRecorder.uri;
      console.log("Recording URI:", uri, "Duration:", durationSeconds, "seconds");

      if (!uri) {
        console.error("No recording URI available");
        if (isMountedRef.current) {
          onError?.("Recording failed");
          setState("idle");
        }
        return;
      }

      await transcribeAudio(uri, durationSeconds);
    } catch (error) {
      console.error("Failed to stop recorder:", error);
      if (isMountedRef.current) {
        onError?.("Couldn't stop recording");
        setState("idle");
      }
    }
  };

  const transcribeAudio = async (uri: string, durationSeconds: number) => {
    try {
      console.log("Starting transcription for:", uri, "duration:", durationSeconds);
      
      const fileInfo = await getInfoAsync(uri);
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
      
      const authToken = await getStoredAuthToken();
      console.log("Auth token present:", !!authToken);
      
      const headers: Record<string, string> = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      
      const response = await uploadAsync(uploadUrl, uri, {
        fieldName: "audio",
        httpMethod: "POST",
        uploadType: FileSystemUploadType.MULTIPART,
        mimeType: "audio/m4a",
        headers,
        parameters: {
          userId: userId || "",
          durationSeconds: String(durationSeconds),
        },
      });
      
      console.log("Response status:", response.status);

      if (!isMountedRef.current) return;

      if (response.status === 429) {
        setLimitReached(true);
        setSecondsRemaining(0);
        onError?.("Daily voice limit reached");
        setState("idle");
        return;
      }

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
        checkVoiceUsage();
      } else {
        onError?.("Didn't catch that");
      }
    } catch (error: any) {
      console.error("Transcription error:", error);
      if (isMountedRef.current) {
        const errorMessage = error.message?.includes("network") || error.message?.includes("fetch")
          ? "Connection failed. Check your internet."
          : "Couldn't understand audio";
        setLastError(errorMessage);
        setCanRetry(true);
        lastRecordingUriRef.current = uri;
        lastRecordingDurationRef.current = durationSeconds;
        onError?.(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setState("idle");
      }
    }
  };
  
  const retryTranscription = async () => {
    const uri = lastRecordingUriRef.current;
    const duration = lastRecordingDurationRef.current;
    
    if (!uri) {
      setLastError(null);
      setCanRetry(false);
      checkConsentAndStart();
      return;
    }
    
    try {
      const fileInfo = await getInfoAsync(uri);
      if (!fileInfo.exists) {
        setLastError(null);
        setCanRetry(false);
        checkConsentAndStart();
        return;
      }
      
      setLastError(null);
      setCanRetry(false);
      setState("processing");
      await transcribeAudio(uri, duration);
    } catch (error) {
      setLastError(null);
      setCanRetry(false);
      checkConsentAndStart();
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

    if (!audioReady) {
      onError?.("Loading voice...");
      return;
    }

    if (limitReached) {
      const minutesLimit = Math.floor(DAILY_LIMIT_SECONDS / 60);
      Alert.alert(
        "Daily Limit Reached",
        `You've used your ${minutesLimit} minutes of voice capture for today. You can still add tasks manually. Your limit resets tomorrow.`
      );
      return;
    }

    if (state === "idle") {
      checkConsentAndStart();
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
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const getQuotaColor = (): string => {
    const percentUsed = 1 - (secondsRemaining / DAILY_LIMIT_SECONDS);
    if (percentUsed >= 0.9) return LaneColors.now.primary;
    if (percentUsed >= 0.7) return LaneColors.soon.primary;
    return LaneColors.later.primary;
  };

  const getButtonColor = () => {
    if (limitReached) return isDark ? "#555555" : "#999999";
    if (state === "recording") return LaneColors.now.primary;
    if (state === "processing") return isDark ? "#888888" : "#666666";
    if (!audioReady) return isDark ? "#666666" : "#888888";
    return LaneColors.soon.primary;
  };

  return (
    <View style={styles.container}>
      {showQuota && !compact && quotaLoaded ? (
        <View style={styles.quotaContainer}>
          <View style={styles.quotaRow}>
            <ThemedText type="caption" secondary>
              Voice Quota
            </ThemedText>
            <ThemedText type="caption" style={{ color: getQuotaColor() }}>
              {formatTime(secondsRemaining)} remaining
            </ThemedText>
          </View>
          <View style={[styles.quotaBar, { backgroundColor: isDark ? "#333333" : "#E0E0E0" }]}>
            <View 
              style={[
                styles.quotaFill, 
                { 
                  width: `${(secondsRemaining / DAILY_LIMIT_SECONDS) * 100}%`,
                  backgroundColor: getQuotaColor(),
                }
              ]} 
            />
          </View>
          {limitReached ? (
            <ThemedText type="caption" style={{ color: LaneColors.now.primary, marginTop: 4 }}>
              Daily limit reached. Resets at midnight.
            </ThemedText>
          ) : null}
        </View>
      ) : null}
      
      <View style={styles.buttonContainer}>
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
        
        {state === "idle" && !limitReached && Platform.OS !== "web" ? (
          <ThemedText type="caption" secondary style={styles.hint}>
            Tap to record
          </ThemedText>
        ) : null}
      </View>
      
      {lastError && canRetry ? (
        <View style={styles.errorContainer}>
          <ThemedText type="caption" style={{ color: LaneColors.now.primary }}>
            {lastError}
          </ThemedText>
          <Pressable 
            onPress={retryTranscription}
            style={styles.retryButton}
          >
            <Feather name="refresh-cw" size={14} color={LaneColors.later.primary} />
            <ThemedText type="caption" style={{ color: LaneColors.later.primary, marginLeft: 4 }}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
      
      <ConsentDisclosure
        visible={showConsentDisclosure}
        type="microphone"
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
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
  quotaContainer: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  quotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  quotaBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  quotaFill: {
    height: "100%",
    borderRadius: 2,
  },
  hint: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
});
