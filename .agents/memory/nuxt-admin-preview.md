---
name: Nuxt admin preview
description: Preserve Nuxt and keep its preview isolated from the Expo app.
---

Keep the existing admin in Nuxt rather than replacing it with React.

**Why:** The user explicitly requested Nuxt and approved adding the existing dashboard, not rebuilding it.

**How to apply:** Treat the web artifact scaffold only as registration infrastructure; preserve the admin's existing framework and behavior.

Use the compiled Nuxt server for the workspace preview until the Nuxt development-server proxy incompatibility is resolved.

**Why:** The development server returned host-guard errors, followed by blank pages with NUXT_E1005 and Vite SendBeforeConnectError behind the preview proxy. The compiled server rendered the login screen successfully.

**How to apply:** Preview changes require a rebuild/restart. Keep preview-only iframe allowances separate from production security headers. Exclude Nuxt generated directories from Metro: Nuxt deletes and recreates them, which otherwise crashes Expo's workspace watcher.
