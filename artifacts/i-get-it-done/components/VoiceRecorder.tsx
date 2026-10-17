import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Pressable, Platform, AppState, useColorScheme } from "react-native";
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
import { getInfoAsync } from "expo-file-system/legacy";

import { getApiUrl } from "@/lib/query-client";
import { getStoredAuthToken } from "@/contexts/AuthContext";
import { showMessage } from "@/lib/alerts";
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
// One take is capped so uploads stay small and a forgotten recording can't
// burn the whole daily quota.
const MAX_RECORDING_SECONDS = 300;
const MIN_RECORDING_MS = 700;
const isWeb = Platform.OS === "web";

function browserCanRecord(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof (globalThis as any).MediaRecorder !== "undefined"
  );
}

function extensionForType(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "m4a";
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function VoiceRecorder({ onTranscriptionComplete: onTranscriptionCompleteProp, onError: onErrorProp, compact = false, userId, showQuota = false }: VoiceRecorderProps) {
  // Timers and the AppState listener outlive a render; always call the latest props.
  const onTranscriptionCompleteRef = useRef(onTranscriptionCompleteProp);
  onTranscriptionCompleteRef.current = onTranscriptionCompleteProp;
  const onErrorRef = useRef(onErrorProp);
  onErrorRef.current = onErrorProp;
  const onTranscriptionComplete = (text: string) => onTranscriptionCompleteRef.current(text);
  const reportError = (message: string) => onErrorRef.current?.(message);
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastRecordingUriRef = useRef<string | null>(null);
  const lastRecordingDurationRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const recordingStartTimeRef = useRef<number>(0);
  const stateRef = useRef<RecordingState>("idle");
  const startingRef = useRef(false);
  const maxSecondsRef = useRef(MAX_RECORDING_SECONDS);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulseScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  const setRecordingState = (next: RecordingState) => {
    stateRef.current = next;
    if (isMountedRef.current) setState(next);
  };

  const stopTicker = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

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

    if (isWeb) {
      // Browsers prompt for the mic themselves, and only when recording starts.
      setAudioReady(true);
    } else {
      initializeAudio();
      checkPriorConsent();
    }

    return () => {
      isMountedRef.current = false;
      stopTicker();
      // Leaving the screen mid-recording must release the mic and restore the
      // audio session, or iOS keeps playback routed for recording.
      if (stateRef.current === "recording") {
        stateRef.current = "idle";
        try {
          audioRecorder.stop().catch(() => {});
        } catch {
          // The recorder may already be released by expo-audio's own cleanup.
        }
        setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
      }
    };
  }, []);

  // If the phone app is backgrounded mid-recording, finish and transcribe what
  // was said instead of leaving the button stuck in "recording". Only a real
  // background counts: iOS goes "inactive" for Notification Center or a call
  // banner, and browsers keep recording in a hidden tab.
  useEffect(() => {
    if (isWeb) return;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background" && stateRef.current === "recording") {
        stopRecording();
      }
    });
    return () => subscription.remove();
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
      reportError("Loading voice... try again");
      return;
    }

    if (limitReached) {
      reportError("Daily voice limit reached");
      return;
    }

    if (isWeb) {
      if (!browserCanRecord()) {
        reportError("This browser can't record audio. Try Chrome, Edge, Firefox or Safari.");
        return;
      }
      await actuallyStartRecording();
      return;
    }

    if (consentDeclined) {
      // Re-enabling goes straight to the disclosure screen.
      await AsyncStorage.removeItem(MIC_CONSENT_DECLINED_KEY);
      setConsentDeclined(false);
      setShowConsentDisclosure(true);
      return;
    }

    if (permissionStatus === "granted") {
      await actuallyStartRecording();
      return;
    }

    const consentShown = await AsyncStorage.getItem(MIC_CONSENT_KEY);
    if (!consentShown) {
      setShowConsentDisclosure(true);
      return;
    }

    await requestPermissionAndStart();
  };

  const requestPermissionAndStart = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!isMountedRef.current) return;
      if (!status.granted) {
        setPermissionStatus("denied");
        reportError("Microphone is off. Allow it in Settings to use voice.");
        return;
      }
      setPermissionStatus("granted");
      await actuallyStartRecording();
    } catch (error) {
      console.error("Permission request failed:", error);
      reportError("Couldn't request microphone permission");
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
    reportError("Voice capture declined");
  };

  const actuallyStartRecording = async () => {
    if (startingRef.current || stateRef.current !== "idle") return;
    startingRef.current = true;
    try {
      setLastError(null);
      setCanRetry(false);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingStartTimeRef.current = Date.now();

      if (!isMountedRef.current) {
        try { await audioRecorder.stop(); } catch (e) {}
        return;
      }

      // Stop on its own at the per-take cap or when today's quota runs out.
      maxSecondsRef.current = Math.max(1, Math.min(MAX_RECORDING_SECONDS, secondsRemaining));
      setElapsedSeconds(0);
      stopTicker();
      tickRef.current = setInterval(() => {
        const elapsed = (Date.now() - recordingStartTimeRef.current) / 1000;
        if (isMountedRef.current) setElapsedSeconds(Math.floor(elapsed));
        if (elapsed >= maxSecondsRef.current && stateRef.current === "recording") {
          stopRecording();
        }
      }, 250);

      setRecordingState("recording");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      if (isMountedRef.current) {
        const text = `${error?.name || ""} ${error?.message || ""}`.toLowerCase();
        let message = "Couldn't start recording";
        if (text.includes("notallowed") || text.includes("permission") || text.includes("denied")) {
          message = isWeb ? "Allow microphone access in your browser to record" : "Microphone permission required";
        } else if (text.includes("notfound") || text.includes("no media devices")) {
          message = "No microphone found";
        }
        reportError(message);
      }
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: false }).catch(() => {});
    } finally {
      startingRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (stateRef.current !== "recording") return;
    stopTicker();
    setRecordingState("processing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const elapsedMs = Date.now() - recordingStartTimeRef.current;
    const durationSeconds = Math.max(1, Math.ceil(elapsedMs / 1000));

    try {
      await audioRecorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });

      const uri = audioRecorder.uri;

      if (!uri) {
        console.error("No recording URI available");
        reportError("Recording failed - try again");
        setRecordingState("idle");
        return;
      }

      if (elapsedMs < MIN_RECORDING_MS) {
        reportError("Too short - tap, speak, then tap again");
        setRecordingState("idle");
        return;
      }

      await transcribeAudio(uri, durationSeconds);
    } catch (error) {
      console.error("Failed to stop recorder:", error);
      reportError("Couldn't stop recording");
      setRecordingState("idle");
    }
  };

  // Builds the multipart body. Phones upload the file on disk; browsers hold
  // the take in memory as a blob: URL.
  const buildUploadForm = async (uri: string, durationSeconds: number): Promise<FormData> => {
    const formData = new FormData();
    if (isWeb) {
      let blob: Blob;
      try {
        blob = await (await fetch(uri)).blob();
      } catch (err: any) {
        throw new Error("FILE_NOT_FOUND: " + (err?.message || String(err)));
      }
      if (blob.size === 0) throw new Error("FILE_EMPTY: Recording is 0 bytes");
      const type = blob.type || "audio/webm";
      formData.append("audio", blob, `recording.${extensionForType(type)}`);
    } else {
      let fileInfo: Awaited<ReturnType<typeof getInfoAsync>>;
      try {
        fileInfo = await getInfoAsync(uri);
      } catch (fileErr: any) {
        throw new Error("FILE_CHECK_FAILED: " + (fileErr?.message || String(fileErr)));
      }
      if (!fileInfo.exists) throw new Error("FILE_NOT_FOUND: Recording file does not exist");
      if (fileInfo.size === 0) throw new Error("FILE_EMPTY: Recording file is 0 bytes");
      formData.append("audio", {
        uri,
        type: "audio/mp4",
        name: "recording.m4a",
      } as any);
    }
    formData.append("durationSeconds", String(durationSeconds));
    return formData;
  };

  const transcribeAudio = async (uri: string, durationSeconds: number) => {
    try {
      let authToken: string | null = null;
      try {
        authToken = await getStoredAuthToken();
      } catch (authErr: any) {
        throw new Error("AUTH_FAILED: " + (authErr?.message || String(authErr)));
      }
      if (!authToken) {
        throw new Error("NO_AUTH_TOKEN: Not logged in");
      }

      const formData = await buildUploadForm(uri, durationSeconds);

      let response: Response;
      try {
        response = await fetch(`${getApiUrl()}/api/transcribe`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: formData,
        });
      } catch (fetchErr: any) {
        throw new Error("FETCH_FAILED: " + (fetchErr?.message || String(fetchErr)));
      }

      if (!isMountedRef.current) return;

      let data: any = {};
      const responseText = await response.text().catch(() => "");
      try { data = JSON.parse(responseText); } catch {}

      if (response.status === 401) {
        reportError("Session expired - please log in again");
        return;
      }

      if (response.status === 429) {
        setLimitReached(true);
        setSecondsRemaining(0);
        reportError("Daily voice limit reached");
        return;
      }

      if (!response.ok) {
        throw new Error("SERVER_" + response.status + ": " + (data.error || responseText.substring(0, 100)));
      }

      if (typeof data.secondsRemaining === "number") {
        setSecondsRemaining(data.secondsRemaining);
        setQuotaLoaded(true);
      }
      if (data.limitReached === true) {
        setLimitReached(true);
      }

      if (data.text && data.text.trim()) {
        setLastError(null);
        setCanRetry(false);
        lastRecordingUriRef.current = null;
        onTranscriptionComplete(data.text.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        let errorMsg = "Didn't catch that - try again";
        if (data.debug) {
          if (data.debug.fileSize < 1000) {
            errorMsg = "Recording too short";
          } else if (data.debug.audioDuration < 0.5) {
            errorMsg = "Audio too brief - speak longer";
          } else {
            errorMsg = "Couldn't hear you - move closer to the mic and try again";
          }
        }
        reportError(errorMsg);
      }
    } catch (error: any) {
      const rawMsg = error?.message || String(error);
      console.error("Transcription error:", rawMsg);
      if (isMountedRef.current) {
        let errorMessage = "Couldn't understand audio";
        const msg = rawMsg.toLowerCase();
        if (msg.includes("fetch_failed") || msg.includes("network") || msg.includes("timeout")) {
          errorMessage = "Connection failed - check your internet";
        } else if (msg.includes("file_not_found") || msg.includes("file_empty") || msg.includes("file_check")) {
          errorMessage = "Recording failed - try again";
        } else if (msg.includes("server_503")) {
          errorMessage = "Voice isn't set up on the server yet";
        } else if (msg.includes("server_504")) {
          errorMessage = "Voice service timed out - try again";
        } else if (msg.includes("server_")) {
          errorMessage = "Voice service error - try again";
        } else if (msg.includes("no_auth_token")) {
          errorMessage = "Please log in to use voice";
        }
        setLastError(errorMessage);
        // Retrying re-sends the same take; a missing file means record again.
        const recordingStillExists = !msg.includes("file_");
        setCanRetry(recordingStillExists);
        lastRecordingUriRef.current = recordingStillExists ? uri : null;
        lastRecordingDurationRef.current = durationSeconds;
        reportError(errorMessage);
      }
    } finally {
      setRecordingState("idle");
    }
  };

  const retryTranscription = async () => {
    const uri = lastRecordingUriRef.current;
    const duration = lastRecordingDurationRef.current;
    setLastError(null);
    setCanRetry(false);

    if (!uri) {
      checkConsentAndStart();
      return;
    }

    if (!isWeb) {
      try {
        const fileInfo = await getInfoAsync(uri);
        if (!fileInfo.exists) {
          checkConsentAndStart();
          return;
        }
      } catch {
        checkConsentAndStart();
        return;
      }
    }

    setRecordingState("processing");
    await transcribeAudio(uri, duration);
  };

  const handlePress = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });

    if (!audioReady) {
      reportError("Loading voice...");
      return;
    }

    if (state === "recording") {
      stopRecording();
      return;
    }

    if (limitReached) {
      const minutesLimit = Math.floor(DAILY_LIMIT_SECONDS / 60);
      showMessage(
        "Daily Limit Reached",
        `You've used your ${minutesLimit} minutes of voice capture for today. You can still add tasks manually. Your limit resets tomorrow.`
      );
      reportError("Daily voice limit reached");
      return;
    }

    if (state === "idle") {
      checkConsentAndStart();
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

  const secondsLeftInTake = maxSecondsRef.current - elapsedSeconds;

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
            accessibilityRole="button"
            accessibilityLabel={state === "recording" ? "Stop recording" : state === "processing" ? "Transcribing" : "Start voice recording"}
            testID="voice-record-button"
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

        {/* In compact rows the status floats under the button so it never
            widens the row and pushes neighbouring buttons off screen. */}
        {state === "recording" ? (
          <ThemedText
            type="caption"
            style={[
              compact ? [styles.compactStatus, { top: size + 2 }] : styles.hint,
              { color: LaneColors.now.primary, fontVariant: ["tabular-nums"] },
            ]}
            testID="voice-record-timer"
          >
            {secondsLeftInTake <= 10 ? `${formatTime(secondsLeftInTake)} left` : formatTime(elapsedSeconds)}
          </ThemedText>
        ) : state === "processing" ? (
          <ThemedText type="caption" secondary style={compact ? [styles.compactStatus, { top: size + 2 }] : styles.hint}>
            {compact ? "..." : "Transcribing..."}
          </ThemedText>
        ) : !limitReached && !compact ? (
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
  compactStatus: {
    position: "absolute",
    width: 64,
    textAlign: "center",
    fontSize: 11,
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
