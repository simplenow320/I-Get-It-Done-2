import { Platform } from "react-native";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REFERRAL_CODE_KEY = "@pending_referral_code";
const REFERRAL_SOURCE_URL_KEY = "@pending_referral_source_url";

function extractRefFromUrl(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const ref = parsed.queryParams?.ref;
    if (typeof ref === "string" && ref.trim().length > 0) {
      return ref.trim();
    }
  } catch {}
  return null;
}

export async function captureReferralFromUrl(): Promise<void> {
  try {
    let url: string | null = null;

    if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.href) {
      url = window.location.href;
    } else {
      url = await Linking.getInitialURL();
    }

    if (!url) return;

    const code = extractRefFromUrl(url);
    if (!code) return;

    await AsyncStorage.multiSet([
      [REFERRAL_CODE_KEY, code],
      [REFERRAL_SOURCE_URL_KEY, url],
    ]);
  } catch {}
}

export function subscribeToReferralLinks(): { remove: () => void } {
  const subscription = Linking.addEventListener("url", async ({ url }) => {
    try {
      const code = extractRefFromUrl(url);
      if (!code) return;
      await AsyncStorage.multiSet([
        [REFERRAL_CODE_KEY, code],
        [REFERRAL_SOURCE_URL_KEY, url],
      ]);
    } catch {}
  });
  return subscription;
}

export async function getPendingReferral(): Promise<{ code: string | null; sourceUrl: string | null }> {
  try {
    const [[, code], [, sourceUrl]] = await AsyncStorage.multiGet([
      REFERRAL_CODE_KEY,
      REFERRAL_SOURCE_URL_KEY,
    ]);
    return { code: code || null, sourceUrl: sourceUrl || null };
  } catch {
    return { code: null, sourceUrl: null };
  }
}

export async function clearPendingReferral(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([REFERRAL_CODE_KEY, REFERRAL_SOURCE_URL_KEY]);
  } catch {}
}
