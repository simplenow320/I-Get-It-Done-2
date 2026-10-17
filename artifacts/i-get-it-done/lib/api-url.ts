import { Platform } from "react-native";
import Constants from "expo-constants";

export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  
  if (host) {
    return `https://${host}`;
  }

  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl;

  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  if (apiUrl) return apiUrl;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }
  // Existing store builds do not supply Expo public build variables.
  // Preserve the original native production endpoint in that configuration.
  return "https://igetitdone.co";
}
