---
name: GitHub sync and publish commits
description: Why pulls from GitHub main stop fast-forwarding after a publish, and how the user wants it handled.
---

Each publish adds an empty "Published your App" commit to the Repl's main. After that, GitHub main and the Repl have diverged, so a fast-forward pull fails.

User's rule: if the Repl has commits GitHub lacks, stop and list them. Only after explicit approval, and after confirming the commit changes zero files (tree equals its parent's), reset to origin/main. Never merge, never push, never publish during a sync unless asked.

**Why:** The user runs GitHub as the source of truth (PRs reviewed there) and wants syncs to be exact, with no extra commits.

**How to apply:** For any GitHub sync, check `git log origin/main..HEAD` first. Changes made directly in the Repl also need to reach GitHub before the next PR merge, or the next sync will diverge.
