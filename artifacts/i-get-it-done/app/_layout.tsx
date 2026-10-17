import React, { useEffect } from "react";
import { Slot } from "expo-router";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getApiUrl } from "@/lib/api-url";
import { getStoredAuthToken } from "@/contexts/AuthContext";

setBaseUrl(getApiUrl());
setAuthTokenGetter(getStoredAuthToken);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return <Slot />;
}
