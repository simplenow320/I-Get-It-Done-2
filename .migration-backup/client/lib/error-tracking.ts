import { Platform } from "react-native";
import Constants from "expo-constants";
import { getApiUrl } from "./query-client";

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
  platform: string;
  appVersion: string;
  userId?: string;
}

let currentUserId: string | undefined;

export function setErrorTrackingUser(userId: string | undefined): void {
  currentUserId = userId;
}

export async function reportError(
  error: Error | string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const errorReport: ErrorReport = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "string" ? undefined : error.stack,
      metadata,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || "unknown",
      userId: currentUserId,
    };

    if (__DEV__) {
      console.error("[Error Tracking]", errorReport);
      return;
    }

    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/errors/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorReport),
    }).catch(() => {
    });
  } catch (e) {
  }
}

export function captureException(
  error: Error,
  context?: { componentStack?: string; extra?: Record<string, unknown> }
): void {
  reportError(error, {
    componentStack: context?.componentStack,
    ...context?.extra,
  });
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  extra?: Record<string, unknown>
): void {
  reportError(message, { level, ...extra });
}

export function wrapErrorHandler<T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          captureException(error, { extra: { context } });
          throw error;
        });
      }
      return result;
    } catch (error) {
      captureException(error as Error, { extra: { context } });
      throw error;
    }
  }) as T;
}
