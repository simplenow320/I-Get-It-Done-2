---
name: Migration fidelity
description: Why infrastructure changes preserve the product's existing navigation and state behavior.
---

Keep infrastructure migrations separate from navigation and offline-state rewrites.

**Why:** This is an existing product with real users. Its nested modal transitions, notification navigation references, and local-store synchronization have behavior that a wholesale conversion to generated hooks or a new navigation hierarchy can lose.

**How to apply:** Prefer a thin compatibility boundary around the existing app when introducing workspace infrastructure. Replace that boundary only in an explicitly scoped navigation or state migration with equivalent interaction coverage.

Preserve no-environment-variable native builds when converting dynamic Expo config to static config.

**Why:** Existing store build profiles may rely on the production endpoint fallback instead of workspace-injected variables. Verifying a development bundle alone does not exercise that path.

**How to apply:** Test API address resolution with no build variables, with public API overrides, and with each committed native build profile.
