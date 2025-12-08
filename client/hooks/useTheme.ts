import { Colors } from "@/constants/theme";
import { useThemeMode } from "@/contexts/ThemeContext";

export function useTheme() {
  const { resolvedTheme, mode, setMode } = useThemeMode();
  const isDark = resolvedTheme === "dark";
  const theme = Colors[resolvedTheme];

  return {
    theme,
    isDark,
    mode,
    setMode,
  };
}
