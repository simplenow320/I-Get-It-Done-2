import { Platform } from "react-native";

export const LaneColors = {
  now: {
    primary: "#FF3B30",
    gradient: ["#FF3B30", "#FF6B60"],
  },
  soon: {
    primary: "#FF9500",
    gradient: ["#FF9500", "#FFB340"],
  },
  later: {
    primary: "#007AFF",
    gradient: ["#007AFF", "#4DA6FF"],
  },
  park: {
    primary: "#AF52DE",
    gradient: ["#AF52DE", "#C77EEA"],
  },
};

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#8E8E93",
    textTertiary: "#C7C7CC",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#007AFF",
    link: "#007AFF",
    backgroundRoot: "#F5F5F7",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F2F2F7",
    backgroundTertiary: "#E5E5EA",
    border: "#E5E5EA",
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#AEAEB2",
    textTertiary: "#636366",
    buttonText: "#FFFFFF",
    tabIconDefault: "#AEAEB2",
    tabIconSelected: "#0A84FF",
    link: "#0A84FF",
    backgroundRoot: "#000000",
    backgroundDefault: "#1C1C1E",
    backgroundSecondary: "#2C2C2E",
    backgroundTertiary: "#38383A",
    border: "#38383A",
    success: "#30D158",
    warning: "#FF9F0A",
    error: "#FF453A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  full: 9999,
};

export const Typography = {
  hero: {
    fontSize: 72,
    fontWeight: "700" as const,
    letterSpacing: -2,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: "700" as const,
    letterSpacing: -1,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: "700" as const,
  },
  h1: {
    fontSize: 28,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 22,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 17,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 15,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 17,
    fontWeight: "400" as const,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
};

export const Shadows = {
  floating: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 4,
  },
  elevated: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
