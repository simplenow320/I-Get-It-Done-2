---
name: Old App Store client compatibility
description: The installed iOS build lags the repo; server must accept what older builds send (team hand-offs especially).
---

The iOS binary people actually run lags the repo by months. Server changes must keep accepting what older builds send.

Known legacy behavior: the App Store build hands a task to a linked teammate by saving only the teammate's nickname in assignedTo, with no delegatedToUserId, via a full-task PUT. Without server-side inference the teammate's "Assigned to Me" list stays empty. The server resolves the nickname to exactly one linked teammate; a one-time SQL migration repaired existing open hand-offs.

The same old build also drops delegatedToUserId when it loads tasks from the server. Its "Shared" badge and teammate hand-off view depend on that field, so on the sender's phone a hand-off seems to vanish seconds after it's made, even though it's saved. The server can't fix this; only the newer app release can.

**Why:** Hand-offs that looked fine to the sender never reached the teammate (seen Oct 2026, also in May 2026 data).

**How to apply:** Before tightening any task or team endpoint, check what the oldest live client sends (git history of client/stores/TaskStore.tsx), and check production rows for its shape. Fix on the server so it ships on publish, with no App Store release needed.
