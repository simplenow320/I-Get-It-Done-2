import { Colors } from "@/constants/theme";
import { useThemeMode } from "@/contexts/ThemeContext";

export function useTheme() {
  const { resolvedTheme, mode, setMode } = useThemeMode();
  const isDark = resolvedTheme === "dark";
  const theme = Colors[resolvedTheme];

  const colors = {
    text: theme.text,
    textSecondary: theme.textSecondary,
    textTertiary: theme.textTertiary,
    background: theme.backgroundRoot,
    surface: theme.backgroundDefault,
    surfaceSecondary: theme.backgroundSecondary,
    border: theme.border,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
  };

  return {
    theme,
    colors,
    isDark,
    mode,
    setMode,
  };
}
