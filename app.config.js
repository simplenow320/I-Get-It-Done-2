const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  expo: {
    name: "I GET IT DONE",
    slug: "i-get-it-done",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "igetitdone",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.igetitdone.app",
      buildNumber: "25",
      infoPlist: {
        NSMicrophoneUsageDescription: "I GET IT DONE uses your microphone for voice-to-task capture. Audio is processed for transcription and immediately deleted - we never store your voice recordings.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FF3B30",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.igetitdone.app",
      permissions: [
        "android.permission.RECORD_AUDIO",
      ],
    },
    web: {
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 280,
          resizeMode: "contain",
          backgroundColor: "#000000"
        }
      ],
      "expo-web-browser",
      [
        "expo-audio",
        {
          microphonePermission: "I GET IT DONE uses your microphone for voice-to-task capture."
        }
      ]
    ],
    experiments: {
      reactCompiler: true
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_DOMAIN 
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : (process.env.EXPO_PUBLIC_API_URL || "https://igetitdone.co"),
      isProduction: isProduction,
      revenueCatApiKeyIOS: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || "",
      revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || "",
      eas: {
        projectId: "99ad023f-5394-483a-8bf9-8c7e330ddfc8"
      }
    }
  }
};
