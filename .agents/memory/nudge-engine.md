---
name: ADHD nudge engine
description: Design constraints for the server-side nudge/reminder system (mobile + web channels)
---

- Server-side escalating/daily/streak nudges: local time computed from user tz offset (getTimezoneOffset semantics), claim-before-send idempotency (UPDATE with eligibility predicate), per-user intensity. Don't add parallel schedulers — one interval in pushNotifications drives everything.
- Delivery is multi-channel: Expo push (users.push_token) AND browser Web Push (web_push_subscriptions table, many per user). New nudge types must go through the nudge engine's unified `deliverNudges` helper, not call the Expo sender directly, or web users get skipped.
- **Why:** queries used to filter on `isNotNull(pushToken)`, silently excluding web-only users; filters now check notificationsEnabled + feature toggle only, channel presence checked after.
- VAPID keypair is auto-generated on first use and stored in the single-row `vapid_config` DB table (not env/secrets) so dev and prod share nothing manual and prod works out of the box.
- Web SW lives at `public/sw.js`; served by Expo web dev server (public/) and by express static in production.
