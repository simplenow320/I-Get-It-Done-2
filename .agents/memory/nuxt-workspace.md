---
name: Nuxt workspace startup
description: Noninteractive Nuxt startup and coexistence with the Expo preview.
---

Use `CI=1 NUXT_TELEMETRY_DISABLED=1` for unattended Nuxt preparation and startup.

**Why:** Nuxt's first-run telemetry consent prompt failed with a TTY initialization error in this workspace, even though dependencies installed.

**How to apply:** Supply these flags when running Nuxt commands rather than treating a consent-prompt failure as a broken application.

Do not equate an admin server responding on port 5000 with the embedded Expo preview working.

**Why:** The preview screenshot targeted the Expo-specific hostname and mobile port even while the Nuxt login route returned HTTP 200 on port 5000.

**How to apply:** Check the actual preview routing before declaring visual verification complete. Preserve the mobile app's production port mapping when arranging admin access.
