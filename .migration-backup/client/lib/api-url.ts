import { Platform } from "react-native";
import Constants from "expo-constants";

export function getApiUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:5000`;
  }

  const apiUrl = Constants.expoConfig?.extra?.apiUrl;
  
  if (apiUrl) {
    return apiUrl;
  }

  const host = process.env.EXPO_PUBLIC_DOMAIN;
  
  if (host) {
    const hostWithoutPort = host.split(":")[0];
    return `https://${hostWithoutPort}`;
  }

  return "https://igetitdone.co";
}
