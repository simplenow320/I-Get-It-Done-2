import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, LaneColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const MCP_URL = "https://igetitdone.co/mcp";

type ConnectorKeyMeta = {
  id: string;
  keyPrefix: string;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
};

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function ConnectorSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [keys, setKeys] = useState<ConnectorKeyMeta[]>([]);
  // Plaintext of the key just created — shown once, never retrievable again.
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "url" | null>(null);

  const loadKeys = async () => {
    try {
      const res = await apiRequest("GET", "/api/connector-keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async () => {
    Haptics.selectionAsync();
    setIsCreating(true);
    try {
      const res = await apiRequest("POST", "/api/connector-keys", { label: "Claude" });
      const data = await res.json();
      if (data.key) {
        setNewKey(data.key);
        await loadKeys();
      } else {
        showMessage("Error", data.error || "Could not create a connector key");
      }
    } catch {
      showMessage("Error", "Could not create a connector key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = (key: ConnectorKeyMeta) => {
    Haptics.selectionAsync();
    confirmAction(
      "Revoke this key?",
      "Claude (or any chat using it) will immediately lose access to your tasks.",
      async () => {
        try {
          await apiRequest("DELETE", `/api/connector-keys/${key.id}`);
          setNewKey(null);
          await loadKeys();
        } catch {
          showMessage("Error", "Could not revoke the key");
        }
      }
    );
  };

  const copyToClipboard = async (value: string, which: "key" | "url") => {
    Haptics.selectionAsync();
    await Clipboard.setStringAsync(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
    >
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: LaneColors.soon.primary }]}>
            <Feather name="message-circle" size={20} color="#FFFFFF" />
          </View>
          <ThemedText type="h4">Manage tasks from Claude</ThemedText>
        </View>
        <ThemedText type="small" secondary style={styles.paragraph}>
          Connect this app to Claude (or any AI chat that supports custom connectors) and add,
          check off, snooze, and break down your tasks right from a conversation. Your phone keeps
          nudging you no matter where a task came from.
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Connect in one click
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="small" secondary style={styles.paragraph}>
          On claude.ai (web) or in Claude Desktop:
        </ThemedText>
        <ThemedText type="small" secondary style={styles.step}>
          1. Open Settings → Connectors → Add custom connector
        </ThemedText>
        <ThemedText type="small" secondary style={styles.step}>
          2. Name it "I Get It Done" and paste this URL:
        </ThemedText>
        <View style={[styles.keyRow, { borderColor: theme.border }]}>
          <ThemedText type="small" style={styles.mono}>
            {MCP_URL}
          </ThemedText>
          <Pressable onPress={() => copyToClipboard(MCP_URL, "url")} hitSlop={8}>
            <Feather
              name={copied === "url" ? "check" : "copy"}
              size={18}
              color={copied === "url" ? LaneColors.later.primary : theme.textSecondary}
            />
          </Pressable>
        </View>
        <ThemedText type="small" secondary style={styles.step}>
          3. Click Connect — Claude opens an I Get It Done sign-in page. Log in, allow access, and
          you're done. No keys to copy.
        </ThemedText>
        <ThemedText type="small" secondary style={styles.step}>
          4. Try it: "Add 'buy milk' to my task list" or "What should I do right now?"
        </ThemedText>
      </View>

      <ThemedText type="h4" style={styles.sectionTitle}>
        Advanced: connector keys
      </ThemedText>
      <ThemedText type="small" secondary style={[styles.paragraph, { marginBottom: Spacing.md }]}>
        Prefer a manual key (for other AI chats or scripts)? Generate one below and paste it as a
        Bearer token in the connector's authentication settings. Existing keys keep working.
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <>
            {newKey ? (
              <View style={styles.newKeyBox}>
                <ThemedText type="small" style={{ fontWeight: "600", color: LaneColors.now.primary }}>
                  Copy this key now — it won't be shown again.
                </ThemedText>
                <View style={[styles.keyRow, { borderColor: theme.border }]}>
                  <ThemedText type="small" style={styles.mono} numberOfLines={1}>
                    {newKey}
                  </ThemedText>
                  <Pressable onPress={() => copyToClipboard(newKey, "key")} hitSlop={8}>
                    <Feather
                      name={copied === "key" ? "check" : "copy"}
                      size={18}
                      color={copied === "key" ? LaneColors.later.primary : theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {keys.length === 0 && !newKey ? (
              <ThemedText type="small" secondary style={styles.paragraph}>
                No key yet. Generate one to get started.
              </ThemedText>
            ) : null}

            {keys.map((k) => (
              <View key={k.id} style={[styles.keyListRow, { borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "500" }}>
                    {k.label || "Connector key"}{" "}
                    <ThemedText type="small" secondary style={styles.mono}>
                      ({k.keyPrefix}…)
                    </ThemedText>
                  </ThemedText>
                  <ThemedText type="small" secondary>
                    {k.lastUsedAt
                      ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                  </ThemedText>
                </View>
                <Pressable onPress={() => handleRevoke(k)} hitSlop={8}>
                  <ThemedText type="small" style={{ color: LaneColors.now.primary, fontWeight: "600" }}>
                    Revoke
                  </ThemedText>
                </Pressable>
              </View>
            ))}

            <Button onPress={handleCreate} disabled={isCreating} style={styles.generateButton}>
              {isCreating ? "Generating…" : keys.length > 0 ? "Generate a new key" : "Generate key"}
            </Button>
          </>
        )}
      </View>

      <ThemedText type="small" secondary style={styles.footerNote}>
        Anyone with your key can manage your tasks — treat it like a password. You can revoke it
        here at any time.
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { marginBottom: Spacing.sm },
  paragraph: { lineHeight: 20 },
  step: { marginTop: Spacing.sm, lineHeight: 20 },
  newKeyBox: { marginBottom: Spacing.md, gap: Spacing.sm },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  keyListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
  },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : Platform.OS === "android" ? "monospace" : "monospace",
    flexShrink: 1,
  },
  generateButton: { marginTop: Spacing.md },
  footerNote: { textAlign: "center", paddingHorizontal: Spacing.lg },
});
