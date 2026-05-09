# I GET IT DONE — Product Overview

## What It Is

I GET IT DONE is a premium mobile task management app designed specifically for adults with ADHD. Unlike generic to-do apps that overwhelm users with infinite lists, calendars, and tags, I GET IT DONE is built around the way an ADHD brain actually works: it reduces decision fatigue, makes task initiation effortless, surfaces only what matters right now, and rewards consistency with visible progress.

The app is built with React Native (Expo SDK 54) for iOS and Android, with an Express.js backend and PostgreSQL database. It uses RevenueCat for subscriptions, Deepgram for voice transcription, OpenAI GPT-4o-mini for AI task extraction, and SendGrid for transactional email.

---

## The Core Concept — The 4-Lane System

Instead of one giant task list, every task lives in one of four lanes. This is the heart of the product.

| Lane  | Color           | Purpose                                                    |
|-------|-----------------|------------------------------------------------------------|
| Now   | Urgent Red      | Tasks for immediate action today                           |
| Soon  | Action Orange   | Tasks scheduled for the next few days                      |
| Later | Calm Blue       | Tasks for future weeks — visible but out of current focus  |
| Park  | Neutral Purple  | A holding zone for ideas to revisit later                  |

Overdue tasks automatically move between Now, Soon, and Later to maintain relevance. Users always control lane assignment — there's no auto-sorting that surprises them.

---

## Pricing Model (Freemium)

| Tier               | Price             | What You Get                                                  |
|--------------------|-------------------|---------------------------------------------------------------|
| **Free Forever**   | $0                | Unlimited task creation, 4-lane system, Quick Dump, Break It Down subtasks, basic dashboard |
| **Free Pro Trial** | $0 (lifetime)     | First 10 lifetime tasks unlock ALL Pro features automatically |
| **Monthly**        | $7.99/month       | All Pro features, 7-day free trial                            |
| **Annual**         | $59.99/year       | All Pro features, 7-day free trial, save 40%                  |
| **Lifetime Pro**   | $149.99 one-time  | All Pro features forever                                      |

**Key distinction:**
- `isPro` = paid subscriber
- `hasProFeatures` = paid subscriber OR free trial active (lifetime tasks < 10)
- Task creation is **never** blocked, regardless of tier

---

## Full Feature List

### 1. Quick Dump (Brain Dump)
The signature ADHD feature. Tap one button labeled "Get it out of your head" and rapid-fire dump every thought — typed or spoken. Then go back through and sort each one into a lane. Eliminates the cognitive load of categorizing while capturing.

- Voice-powered capture using Deepgram Nova-2 transcription
- AI extraction via GPT-4o-mini turns long voice transcripts into multiple individual tasks
- Two-phase flow: capture phase, then sort phase with swipe gestures
- Post-sort celebration: "That's X fewer things in your head"

### 2. Break It Down (Subtasks)
Convert any overwhelming task into bite-sized subtasks with one tap. Visual progress bars show completion percentage. Critical for ADHD users who get stuck staring at vague, large tasks.

- Add unlimited subtasks per task
- Tap to toggle complete with haptic feedback
- Auto-deletes when parent task is removed
- Progress ring shows percentage done

### 3. Focus Mode (Pro)
A minimalist single-task interface. Shows only one Now task at a time. Swipe right to complete, swipe left to defer to Park. Eliminates choice paralysis.

- Card-stack swipe interface
- Subtask progress ring overlay
- Direct launch into Focus Timer

### 4. Focus Timer (Pro)
Pomodoro-style sprint timer with three preset durations: 10, 15, or 25 minutes.

- Visual countdown ring
- Pause/resume support
- Celebration screen on completion
- Awards XP and updates total focus minutes

### 5. Daily Dumps (Daily Rituals)
Three time-based check-in slots throughout the day to keep your head clear:
- **Morning Dump** (12am – noon) — set the day
- **Midday Reset** (noon – 5pm) — re-center
- **Evening Dump** (5pm – midnight) — wind down

Each slot is automatically marked complete when any task is created during that window. The dashboard shows progress (X/3) with smart status messages: "Three for three. Your head's clear." or "You missed your morning dump."

### 6. Daily Summary Card
Morning/daily motivational overview showing yesterday's wins, today's progress, and a "Pick up here" suggestion to start your day with momentum.

### 7. Gamification Engine
- **Streak tracking** — current and longest daily streaks with grace protection
- **XP/points** — earned from task completion, subtask completion, focus minutes
- **Level progression** — Starter → progressing levels
- **Achievement notifications** — celebratory modal with golden gradients and confetti
- **Streak badges** — compact in header, large on profile

### 8. Voice Capture (Pro)
Hands-free task entry powered by Deepgram Nova-2.

- Daily limit: 10 minutes (600 seconds) per user
- Voice usage quota visible in UI
- Auto-language detection
- AI extracts multiple discrete tasks from a single voice memo
- Audio is processed and immediately deleted — never stored

### 9. Team Hub & Delegation (Pro)
Hand off tasks to teammates or external contacts with full status tracking.

- **Team mode** — link real users via 8-character invite codes
- **Contacts mode** — manage external people (name, role, color) for delegation
- **Bidirectional team relationships** — both parties see the link
- **Invite management** — send, decline, cancel, regenerate, resend
- **Status tracking** — Assigned, In Progress, Blocked, Waiting, Needs Review, Done
- **Delegation log** — note history with type tags (Asked Question, Sent Update, etc.)
- **"Delegated To Me" view** — separate inbox for tasks others assigned you

### 10. Weekly Reset (Pro)
End-of-week reflective review.

- Tasks completed this week
- Points earned summary
- Stale task detection (stuck in a lane too long) with re-sort suggestions
- Future-week planning prompts

### 11. Push Notifications
Three intelligent reminder types running on a 60-second background scheduler:

- **Due-soon notifications** (every 30 min) — tasks due in under 2 hours
- **Overdue notifications** (every 4 hours) — tasks past their due date
- **Streak protection** (every 8 hours) — users with 2+ day streaks who haven't checked in today

Plus user-configurable daily reminders:
- Morning game plan (default 8:00 AM)
- Midday reset (default 12:30 PM)
- Evening wind-down (default 8:00 PM)

### 12. Authentication & Security
- JWT-based authentication with bcrypt password hashing
- 7-day token expiry with global 401 interceptor and graceful session expiry handling
- Rate limiting on login and password-reset endpoints
- Email-based password reset (6-digit code via SendGrid)
- Change password from within app
- Account deletion (Apple 5.1.1(v) compliance) — wipes all user data including tasks, subtasks, contacts, team links, stats, voice usage, delegation notes

### 13. Subscription Management
- RevenueCat integration wrapping Apple StoreKit and Google Play Billing
- Webhook endpoint syncs purchases, renewals, cancellations, expirations, billing issues to the database
- Hybrid status check: server DB + client RevenueCat SDK = instant Pro unlock after purchase, no webhook delay
- Past-due payment banner shown to users with billing issues
- Restore purchases support

### 14. Onboarding Flow
A 4-step intro for new users:
1. **Welcome** — branded intro, lane preview
2. **Lane Setup** — customize lane timing (e.g., "Now" = today vs 24 hours)
3. **Mode Selection** — choose Solo or Team workflow
4. **Build Your Rhythm** — pre-select daily reminder times (morning + evening enabled by default)

### 15. Profile & Settings
- User info and display name editing
- Streak and level/XP display
- Lifetime stats (tasks completed, focus minutes, etc.)
- Achievement gallery
- Theme selection (Light / Dark / Auto)
- Notification settings (3 toggles: morning, midday, evening)
- Subscription status and management
- Support, FAQ, Privacy Policy, Terms links
- Change password
- Account deletion

### 16. Task History
A searchable log of all completed tasks with date filters:
- Today
- This Week
- This Month
- All Time

Grouped by date, showing original lane, subtask completion ratios, and timestamps.

### 17. AI Task Extraction
GPT-4o-mini processes voice transcripts to identify actionable tasks while filtering out meta-commentary like "I'm testing the mic" or "um, let me think." Returns clean, individual task titles.

---

## Design Principles

- **Premium aesthetic** — Apple meets ESPN; iOS 26 liquid glass with bold gradients
- **No emojis in the UI** — clean, professional
- **Typography scale** — 72px hero numbers down to 17px body, weight-based hierarchy
- **8–24px border radii, 4–40px spacing** — consistent rhythm
- **Haptic feedback** — every meaningful interaction
- **Spring animations** — for add/complete/sort actions
- **Confetti celebrations** — on milestone completions
- **Distinct lane colors** — never confused at a glance
- **Mobile-first** — built for one-thumb operation

---

## Technical Architecture

| Layer              | Technology                                                                     |
|--------------------|--------------------------------------------------------------------------------|
| **Frontend**       | React Native, Expo SDK 54, TypeScript, React Navigation 7+                     |
| **State**          | React Context API (TaskStore, GamificationStore, AuthContext, RevenueCatContext) |
| **Data Fetching**  | TanStack React Query                                                            |
| **Backend**        | Express.js, TypeScript                                                          |
| **Database**       | PostgreSQL with Drizzle ORM                                                     |
| **Auth**           | JWT, bcrypt, AsyncStorage for persistence                                       |
| **Payments**       | RevenueCat (iOS + Android)                                                      |
| **Voice**          | Deepgram Nova-2 + expo-audio for recording                                      |
| **AI**             | OpenAI GPT-4o-mini for task extraction                                          |
| **Email**          | SendGrid (sender: info@simplenow.co)                                            |
| **Push**           | expo-server-sdk + expo-notifications                                            |
| **Animations**     | react-native-reanimated, react-native-gesture-handler                           |
| **Crash Safety**   | Custom ErrorBoundary with restart                                               |

---

## Database Tables

| Table              | Purpose                                                                        |
|--------------------|--------------------------------------------------------------------------------|
| `users`            | Accounts, auth, push tokens, subscription status, lifetime task counter        |
| `tasks`            | Core task data + ADHD fields (lane, reminder type, focus time, overdue flag)   |
| `subtasks`         | Break It Down items (cascade-deleted with parent task)                         |
| `user_stats`       | Gamification: points, level, streaks, focus minutes, streak protection         |
| `contacts`         | External people for delegation (name, role, color)                             |
| `team_invites`     | 8-character invite codes with status and expiry                                |
| `team_members`     | Bidirectional teammate relationships                                           |
| `voice_usage`      | Daily voice transcription seconds per user                                     |
| `delegation_notes` | Communication history on delegated tasks                                       |

---

## API Surface

**Auth & Account:** register, login, logout, me, change password, forgot password, reset password, init, update display name, delete account

**Tasks & Subtasks:** list, create, update, delete (CRUD on both)

**Voice & AI:** transcribe (Deepgram), extract tasks (OpenAI), voice usage check, debug voice config

**Contacts & Team:** list contacts, create/delete contacts, send/accept/decline/cancel/regenerate/resend invites, list invites, list team members, remove teammates

**Delegation:** list tasks delegated to me, update delegation status, add delegation note

**Subscription:** get subscription status, RevenueCat webhook handler

**Notifications:** update push token, get notification settings, send test notification

**Stats & Sync:** get/update user stats, bulk sync (offline support)

**Support & Errors:** contact support, log client errors

**Background Jobs:** notification scheduler running every 60 seconds (due-soon every 30 min, overdue every 4 hours, streak every 8 hours)

**Static Pages:** landing, manifest, support, privacy, terms, marketing, app-store-privacy, data-deletion

---

## Production Status

**App Store Submission Score: 92/100 — ready for submission.**

Bundle ID: `com.igetitdone.app`
Current version: 1.0.7 (build 3)
ASC App ID: 6756545884

**Demo Account for Apple Review:** `demo@igetitdone.co` / `AppleReview2024!`

**Required Secrets (all configured in Replit):**
- `JWT_SECRET` — auth token signing
- `SENDGRID_API_KEY` — password resets and support emails
- `DEEPGRAM_API_KEY` — voice transcription
- `OPENAI_API_KEY` — AI task extraction
- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` — iOS purchases
- `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` — Android purchases (optional)
- `REVENUECAT_WEBHOOK_SECRET` — webhook authentication

---

## Why This App Exists

Adults with ADHD face four core challenges that traditional task apps make worse:

1. **Task initiation paralysis** — staring at a long list, unable to start
2. **Overwhelm** — too many open loops, too many decisions
3. **Working memory drift** — forgetting tasks before capturing them
4. **Inconsistent reward systems** — no dopamine hit from completing things

I GET IT DONE addresses each one directly:

- **Quick Dump** removes the friction of capture
- **The 4-lane system** removes the friction of prioritizing
- **Break It Down** removes the friction of starting
- **Focus Mode + Timer** removes the friction of doing
- **Streaks + XP + Achievements + Confetti** restores the dopamine loop
- **Daily Dumps + Push Notifications** keep users coming back without nagging

It's not built to "manage everything." It's built to make sure the next right thing happens.
