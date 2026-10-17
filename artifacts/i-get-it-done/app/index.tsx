import React from "react";
import { NavigationIndependentTree } from "@react-navigation/native";
import LegacyApp from "@/LegacyApp";

// Preserve the original navigation tree, including modal transitions and
// notification navigation refs, inside Expo Router's workspace entry point.
export default function Index() {
  return <NavigationIndependentTree><LegacyApp /></NavigationIndependentTree>;
}
