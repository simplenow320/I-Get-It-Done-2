# I GET IT DONE — Dev QA & Security Checklist

---

## 1. KNOWN BUGS (Reported by Users)

### BUG 1: Focus Mode Lock Screen on iOS — FIXED
- **What users saw**: Pro features (Focus Mode) showed a lock screen even for users with valid access.
- **Why it happened**: The `useSubscription` hook only used cookies for auth. iOS native (Expo Go) blocks cross-origin cookies, so every call to `/api/subscription/:userId` returned 401. The fallback defaulted `freeTrialActive` to `false`, which triggered the ProFeatureGate lock screen.
- **What was fixed**: Added `Authorization: Bearer <token>` header to the `useSubscription` queryFn. The server's `requireAuth` middleware already checks Bearer first, then falls back to cookies. iOS now works.
- **File changed**: `client/hooks/useSubscription.ts`

### BUG 2: Tasks Disappearing — FIXED
- **What users saw**: Tasks vanished from their lane after some time.
- **Why it happened**: The `checkOverdueTasks` function runs every 60 seconds and moves tasks between lanes when due dates pass (Later to Soon, Soon to Now). After each move, it calls `saveTaskToApi()` to sync the change to the server. On iOS, these API calls failed silently with 401 (same cookie auth bug). The server never received the lane change. On the next data refresh, the task snapped back to its original server-side lane — or appeared to vanish from the lane the user was viewing.
- **What was fixed**: Same Bearer token fix. Lane moves now persist to the server on iOS.
- **Files**: `client/stores/TaskStore.tsx` (lines 909-951), `client/hooks/useSubscription.ts`

### BUG 3: Upgrade Button Not Working — FIXED
- **What users saw**: User with fewer than 10 lifetime tasks (free trial active) tapped the upgrade/subscribe button and nothing happened.
- **Why it happened**: Same 401 auth failure on iOS. The subscription status check failed, so the app couldn't determine the user's actual state — `freeTrialActive` was `false` AND `isPro` was `false`. The UI was stuck in a broken state. Also, RevenueCat purchases only work in production builds (not Expo Go).
- **What was fixed**: Bearer token fix. Subscription status now returns correctly on iOS. RevenueCat limitation in Expo Go is expected behavior — purchases require a TestFlight/App Store build.

### BUG 4: App Freezing — NOT FIXED YET
- **What users saw**: App became completely unresponsive.
- **Why it happens**:
  1. JWT token expires after 7 days. There is no refresh mechanism.
  2. After expiry, the app still thinks the user is logged in (user data is in AsyncStorage), but every API call silently fails with 401.
  3. A function called `handleExpiredSession()` exists in `AuthContext.tsx` to handle this exact scenario — but it is never called anywhere in the codebase. There is no global 401 interceptor.
  4. Every time the app comes back to the foreground, the AppState listener calls `loadFromDatabase()`, which makes 2 API calls (tasks + contacts), each retrying 3 times with exponential backoff (1s, 2s, 4s delays). That's up to 24 seconds of blocked background activity per resume — all failing.
  5. Most API calls (`apiRequest`) have no timeout. If the server is slow or unresponsive, requests hang forever.
- **Files to fix**: `client/contexts/AuthContext.tsx`, `client/stores/TaskStore.tsx`, `client/lib/query-client.ts`
- **Recommended fix**: Wire up `handleExpiredSession()` as a global 401 handler in `apiRequest`, or implement token refresh. Either way, a 401 should force the user back to the login screen instead of leaving them in a zombie state.

---

## 2. SUPABASE SECURITY ALERTS

Supabase flagged 4 tables with **Row Level Security (RLS) disabled**. These are `ERROR` level, externally facing:

| Table | Issue | Risk |
|-------|-------|------|
| `public.users` | RLS not enabled | Any authenticated Supabase client can read/write all user records |
| `public.tasks` | RLS not enabled | Any authenticated Supabase client can read/write all tasks |
| `public.subtasks` | RLS not enabled | Any authenticated Supabase client can read/write all subtasks |
| `public.contacts` | RLS not enabled | Any authenticated Supabase client can read/write all contacts |

### Context
The app currently uses an Express.js API server that sits between the client and the database. The Express server handles auth via JWT middleware (`requireAuth`) and validates user ownership on most endpoints. So the database is not directly exposed to clients through Supabase's PostgREST API.

**However**, if the Supabase project URL and anon key are ever exposed (they're in client-side code or env vars), anyone could bypass the Express server entirely and query the database directly through Supabase's auto-generated REST API with zero restrictions.

### What to do
For each table, enable RLS and create policies that restrict access:

```sql
-- Enable RLS on all flagged tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Example policy: users can only access their own row
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id);

-- Example policy: users can only access their own tasks
CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL USING (auth.uid()::text = user_id);

-- Example policy: subtasks belong to tasks the user owns
CREATE POLICY "Users can manage own subtasks" ON public.subtasks
  FOR ALL USING (
    task_id IN (SELECT id FROM public.tasks WHERE user_id = auth.uid()::text)
  );

-- Example policy: users can manage own contacts
CREATE POLICY "Users can manage own contacts" ON public.contacts
  FOR ALL USING (auth.uid()::text = user_id);
```

Also enable RLS on any other tables that may have been missed: `user_stats`, `delegation_notes`, `team_invites`, `team_members`, `voice_usage`, `focus_sessions`.

Reference: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

---

## 3. API ENDPOINTS MISSING AUTH (Express Server)

Even though the Express server protects most routes, these endpoints have **no `requireAuth` middleware**. Anyone who knows the URL can call them:

| Endpoint | What it does | Risk |
|----------|-------------|------|
| `POST /api/subtasks` | Creates a subtask on any task | Medium — can inject subtasks into anyone's tasks |
| `PUT /api/subtasks/:id` | Updates any subtask | Medium — can modify anyone's subtask data |
| `DELETE /api/subtasks/:id` | Deletes any subtask | Medium — can delete anyone's subtasks |
| `DELETE /api/contacts/:id` | Deletes any contact | Medium — can delete anyone's contacts |
| `PUT /api/users/:id/display-name` | Changes any user's display name | Low — cosmetic but still unauthorized |
| `POST /api/team/invite` | Creates team invites | Low — spam risk |
| `POST /api/team/invite/decline` | Declines any invite | Low |
| `DELETE /api/team/invite/:id` | Deletes any invite | Low |
| `POST /api/team/invite/:id/resend` | Resends any invite | Low |
| `POST /api/team/invite/:id/regenerate` | Regenerates any invite code | Medium — could hijack invites |

**Fix**: Add `requireAuth` middleware and ownership validation to all of these. Pattern to follow:

```typescript
// Before (no auth):
app.post("/api/subtasks", async (req, res) => { ... });

// After (with auth + ownership check):
app.post("/api/subtasks", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  // Verify the parent task belongs to authReq.user.userId
  ...
});
```

### Server-Side Enforcement Gap
The `POST /api/tasks` endpoint calculates whether the user is Pro but does NOT enforce it. Free users past the 10-task trial limit can create unlimited tasks by calling the API directly. The gating only exists in the client UI (`ProFeatureGate`).

**Fix**: Add a server-side check that rejects task creation if `lifetimeTasksCreated >= 10` and user is not an active subscriber.

---

## 4. FULL E2E TEST CHECKLIST

### A. Authentication

| # | Test | Pass? |
|---|------|-------|
| A1 | Login with valid credentials — token stored, user redirected to main app | |
| A2 | Login with wrong password — clear error message, no crash | |
| A3 | Login with non-existent email — clear error, no email enumeration | |
| A4 | Login while offline — shows connection error, not a freeze | |
| A5 | Login timeout after 30s — shows timeout message | |
| A6 | Rate limiting — 20+ rapid login attempts get blocked | |
| A7 | Register new account — auto-login, token stored | |
| A8 | Register with existing email — clear error | |
| A9 | Register with password under 6 chars — validation error | |
| A10 | Logout — clears AsyncStorage, clears in-memory token, navigates to login | |
| A11 | Logout — TaskStore clears all data (tasks, contacts, settings) | |
| A12 | Logout — no stale API calls continue in background | |
| A13 | Forgot password — sends email from info@simplenow.co via SendGrid | |
| A14 | Reset code — 6 digits, expires after 15 minutes, single use | |
| A15 | Account deletion — requires password, cascading delete, user logged out | |
| A16 | **CRITICAL**: Open app after 7+ days of inactivity — what happens? (currently freezes, should redirect to login) | |
| A17 | **CRITICAL**: Verify `handleExpiredSession()` is called when a 401 is received | |

### B. Tasks

| # | Test | Pass? |
|---|------|-------|
| B1 | Create task in each lane (Now, Soon, Later, Park) — appears immediately | |
| B2 | Task persists to server after creation | |
| B3 | `lifetimeTasksCreated` increments on create, never decrements on delete | |
| B4 | Update task title/notes — syncs to server | |
| B5 | Move task between lanes — syncs to server | |
| B6 | Delete task — removed locally and from server | |
| B7 | Complete task — `completedAt` set, appears in completed list, points awarded | |
| B8 | Overdue: Later task with past due date moves to Soon | |
| B9 | Overdue: Soon task with past due date moves to Now | |
| B10 | Overdue: Now task with past due date gets flagged `isOverdue: true` | |
| B11 | Park lane tasks are NOT affected by overdue logic | |
| B12 | Lane moves from overdue check are saved to server (not just local) | |
| B13 | 60-second overdue check interval doesn't stack or memory leak | |
| B14 | Add/toggle/delete subtasks — syncs correctly | |
| B15 | Subtask progress bar updates accurately | |
| B16 | Quick Dump: add unsorted task, sort into lane, remove | |
| B17 | Quick Dump: add multiple unsorted tasks at once | |

### C. Offline & Sync

| # | Test | Pass? |
|---|------|-------|
| C1 | Create task offline — saved to AsyncStorage | |
| C2 | Come back online — task syncs to server | |
| C3 | Non-401 server error — retries 3x with backoff (1s, 2s, 4s) | |
| C4 | 401 server error — NO retry, local cache preserved | |
| C5 | App foreground from background — `loadFromDatabase` triggers | |
| C6 | No data loss when local and server are out of sync | |
| C7 | Empty task array is never cached (prevents data wipe race condition) | |

### D. Subscription & Monetization

| # | Test | Pass? |
|---|------|-------|
| D1 | New user (0 tasks): `freeTrialActive = true`, all Pro features unlocked | |
| D2 | User at 9 tasks: `freeTrialActive = true`, `freeTasksRemaining = 1` | |
| D3 | User at 10 tasks: `freeTrialActive = false`, Pro features locked | |
| D4 | Deleting tasks does NOT reduce `lifetimeTasksCreated` counter | |
| D5 | Free users (post-trial) can still create unlimited tasks, use 4 lanes, Quick Dump, Break It Down | |
| D6 | `/api/subscription/:userId` requires Bearer token (iOS fix verified) | |
| D7 | Subscription endpoint returns 403 if userId doesn't match auth token | |
| D8 | RevenueCat initializes on iOS/Android, skips on web | |
| D9 | Monthly ($7.99), Annual ($59.99), Lifetime ($149.99) packages available | |
| D10 | Purchase flow completes and updates subscription status | |
| D11 | Restore purchases finds existing subscriptions | |
| D12 | Webhook: `INITIAL_PURCHASE` sets status "active" (or "trialing" for trial) | |
| D13 | Webhook: `CANCELLATION` sets "canceled", `EXPIRATION` sets "none" | |
| D14 | Webhook: `BILLING_ISSUE` sets "past_due" | |
| D15 | Webhook: invalid secret returns 401 | |
| D16 | ProFeatureGate blocks Focus Mode, Weekly Reset, Team Hub when not Pro | |
| D17 | ProFeatureGate upgrade button navigates to Subscription screen (cross-tab) | |
| D18 | Subscription check failure (network) — shows loading state, not crash | |

### E. Focus Mode & Timer

| # | Test | Pass? |
|---|------|-------|
| E1 | Loading spinner shown while subscription data fetches (no lock screen flash) | |
| E2 | Pro/trial users can enter Focus Mode | |
| E3 | Non-Pro users see ProFeatureGate | |
| E4 | Timer options: 10, 15, 25 minutes — countdown works | |
| E5 | Timer completion records focus session to database | |
| E6 | Swipe actions work (complete, skip) | |

### F. Gamification

| # | Test | Pass? |
|---|------|-------|
| F1 | Completing a task awards points/XP | |
| F2 | Streak increments on consecutive daily completions | |
| F3 | Level progression calculates correctly | |
| F4 | Stats persist to server and load on app start | |
| F5 | Achievement notifications display, confetti animates | |

### G. Team & Delegation

| # | Test | Pass? |
|---|------|-------|
| G1 | Create invite — 8-char code, expires in 7 days | |
| G2 | Accept invite — bidirectional team relationship created | |
| G3 | Decline/cancel/resend/regenerate invites work | |
| G4 | Team members list loads correctly | |
| G5 | Remove team member — bidirectional deletion | |
| G6 | Team tab only shows when mode = "team" | |
| G7 | Delegate task to team member — appears in their "delegated to me" list | |
| G8 | Update delegation status and add notes | |
| G9 | Undelegate task clears all delegation fields | |

### H. Voice Capture

| # | Test | Pass? |
|---|------|-------|
| H1 | Voice recording starts (microphone permission granted) | |
| H2 | Audio transcribed via Deepgram Nova-2 | |
| H3 | Daily voice limit: 600 seconds, blocked with clear message when exceeded | |
| H4 | AI task extraction via OpenAI GPT-4o-mini returns task array | |
| H5 | Extracted tasks can be added to unsorted list | |
| H6 | Session expiry during recording — handled gracefully (currently shows message but doesn't logout) | |

### I. Navigation & UI

| # | Test | Pass? |
|---|------|-------|
| I1 | Unauthenticated: shows Login/Register/Forgot Password | |
| I2 | Authenticated + onboarding incomplete: shows Onboarding | |
| I3 | Authenticated + onboarding complete: shows Main tabs | |
| I4 | Tab bar: Dashboard, Focus, Team (conditional), Profile | |
| I5 | Safe area insets correct on all screens (notch, Dynamic Island, home indicator) | |
| I6 | Keyboard avoidance works on all screens with text inputs | |
| I7 | No emojis anywhere in the UI | |
| I8 | Lane colors: Red (Now), Orange (Soon), Blue (Later), Purple (Park) | |

### J. Platform-Specific

| # | Test | Pass? |
|---|------|-------|
| J1 | iOS: Bearer token sent on all API calls (not relying on cookies) | |
| J2 | iOS: RevenueCat works in TestFlight build | |
| J3 | iOS: Push notifications work on physical device | |
| J4 | iOS: Voice capture works | |
| J5 | Android: Bearer token sent on all API calls | |
| J6 | Android: RevenueCat works in production build | |
| J7 | Android: Back button/gesture navigation works | |
| J8 | Web: Cookie auth works, RevenueCat skipped, native feature fallbacks shown | |

### K. Server & Database

| # | Test | Pass? |
|---|------|-------|
| K1 | DB pool: max 10 connections, 30s idle, 10s connect timeout | |
| K2 | `DATABASE_URL` env var set | |
| K3 | `JWT_SECRET` set, 32+ chars in production | |
| K4 | `SENDGRID_API_KEY` configured | |
| K5 | `DEEPGRAM_API_KEY` configured | |
| K6 | `OPENAI_API_KEY` configured | |
| K7 | `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` configured | |
| K8 | `REVENUECAT_WEBHOOK_SECRET` configured for production | |
| K9 | CORS allows Replit domains + port 5000 | |
| K10 | Static pages served: /support, /privacy, /terms, /app-store-privacy | |
| K11 | ErrorBoundary wraps entire app, restart button uses `reloadAppAsync` | |
| K12 | Error reporting to `/api/errors/report` — rate limited 10/60s | |
| K13 | Supabase RLS enabled on all public tables (see Section 2) | |

---

## 5. PRIORITY SUMMARY

### P0 — Fix Before Any Release
1. **App freeze from expired JWT** — `handleExpiredSession()` is defined but never called. Need a global 401 handler.
2. **Supabase RLS disabled** — All 4 flagged tables (users, tasks, subtasks, contacts) are wide open via Supabase REST API. Enable RLS + add policies.
3. **11 Express endpoints have no auth** — Subtask CRUD, contact delete, team invite operations, display name update. Add `requireAuth` middleware.
4. **No server-side Pro enforcement** — Task creation limit (10 free tasks) is only enforced in the client UI. Add server-side check.

### P1 — Fix Soon
5. **No timeout on API requests** (except login's 30s) — Requests can hang forever.
6. **Voice recorder 401** shows message but doesn't trigger logout — User stays stuck.
7. **`saveState` effect** fires on every state change — Could cascade during rapid updates. Consider debouncing.

### P2 — Monitor / Nice to Have
8. Token refresh mechanism (currently hard 7-day expiry with no recovery path).
9. RevenueCat init race condition (minor, handles errors gracefully).
10. Background sync queue for offline changes.
