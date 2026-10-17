import { Alert, Platform } from "react-native";

// react-native-web's Alert.alert is a no-op, so every message and confirmation
// in the app goes through these helpers, which use the browser dialogs on web.

export function showMessage(title: string, message?: string, onDismiss?: () => void): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    onDismiss?.();
    return;
  }
  Alert.alert(title, message, onDismiss ? [{ text: "OK", onPress: onDismiss }] : undefined);
}

export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  options: { destructive?: boolean; cancelText?: string } = {}
): void {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: options.cancelText || "Cancel", style: "cancel" },
    { text: confirmText, style: options.destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

// apiRequest throws errors shaped like `400: {"error":"..."}`. Pull out the
// server's message so users see why something failed.
export function apiErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const match = raw.match(/^\d{3}:\s*(.*)$/s);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed.error === "string" && parsed.error) return parsed.error;
    } catch {
      // body wasn't JSON
    }
  }
  return fallback;
}

export function apiErrorStatus(error: unknown): number | null {
  const raw = error instanceof Error ? error.message : "";
  const match = raw.match(/^(\d{3}):/);
  return match ? Number(match[1]) : null;
}
