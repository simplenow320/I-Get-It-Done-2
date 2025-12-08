import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "hero" | "heroNumber" | "largeTitle" | "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption" | "link" | "wordmark";
  secondary?: boolean;
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  secondary = false,
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    if (secondary) {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "hero":
        return Typography.hero;
      case "heroNumber":
        return Typography.heroNumber;
      case "largeTitle":
        return Typography.largeTitle;
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.link;
      case "wordmark":
        return Typography.wordmark;
      default:
        return Typography.body;
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
