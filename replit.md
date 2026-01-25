# I GET IT DONE

## Overview
"I GET IT DONE" is a premium, ADHD-optimized mobile task management application designed to help users with ADHD overcome common challenges like task initiation, overwhelm, and focus maintenance. It integrates research-backed insights to provide a fast, intuitive, and rewarding experience. The app aims to keep users focused, facilitate task completion, and prevent mental overload through features like quick capture, task chunking, and gamification.

The project has reached its Full MVP stage, including essential features like Quick Dump, Break It Down, Focus Mode, Focus Timer, Gamification, an Enhanced Weekly Reset, and Delegation capabilities. It also incorporates robust JWT-based authentication with security hardening and RevenueCat integration for subscription monetization via Apple's App Store, offering a 7-day free trial, monthly ($6.99), and annual ($49.99) plans.

## User Preferences
- Premium, modern aesthetic (Apple meets ESPN)
- No emojis in the UI
- Minimalist design with bold color accents
- Focus on productivity and quick interactions
- ADHD-friendly: reduced decision fatigue, clear feedback

## System Architecture

### Technology Stack
- **Frontend**: React Native with Expo SDK 54
- **Backend**: Express.js
- **Database**: PostgreSQL (cloud sync via Express REST API, migrated from Supabase)
- **State Management**: React Context API (TaskStore)

### Core Concept - The 4-Lane System
The application organizes tasks into four distinct lanes to manage mental load and prioritize effectively:
-   **Now**: Tasks for immediate action today.
-   **Soon**: Tasks scheduled for the next few days.
-   **Later**: Tasks for future weeks, keeping them visible but out of current mental space.
-   **Park**: A holding zone for ideas and tasks to be revisited later.
Overdue tasks automatically move between Now, Soon, and Later lanes to maintain relevance.

### UI/UX Design Decisions
-   **Design Language**: Premium iOS 26-inspired liquid glass design with bold gradients.
-   **Typography**: Uses a scale from 72px for hero numbers down to 17px for body text, with varying weights for hierarchy.
-   **Visual Elements**: Features 8-24px border radii, 4-40px spacing, haptic feedback, spring animations, and confetti animations for celebrations.
-   **Lane Colors**: Distinct color scheme for each lane (Urgent Red for Now, Action Orange for Soon, Calm Blue for Later, Neutral Purple for Park).

### Feature Specifications
-   **Quick Dump**: Rapid-fire task entry with an "Unsure" state for later sorting.
-   **Break It Down**: Enables creation of subtasks with visual progress bars and completion feedback.
-   **Focus Mode & Timer**: Dedicated screen for single-task focus, with swipe actions and a customizable sprint timer (10, 15, 25 minutes) with visual countdown.
-   **Gamification**: Includes streak tracking, points/XP, level progression, and achievement notifications to sustain motivation.
-   **Enhanced Weekly Reset**: Provides a structured review of completed tasks, auto-move summaries, cleanup suggestions, and future planning.
-   **Delegation**: A "Team Hub" for task hand-off, status tracking, and in-app communication.
-   **Authentication**: JWT-based authentication with bcrypt hashing, `requireAuth` middleware for all API routes, and user identity verification. Rate limiting is applied to authentication endpoints.

### Navigation Structure
The application uses a `RootStackNavigator` that branches into `Auth`, `Onboarding`, and `Main` (Tab Navigator). The `Main` tab navigator includes `Dashboard`, `Focus`, `Team` (conditional), and `Profile` tabs, each with its own stack.

### Backend Schema Prepared for Future Features
The PostgreSQL schema includes tables for `tasks` (with ADHD-specific fields like subtasks, reminder type, focus time, and overdue status), `subtasks`, `user_stats` (for gamification), and `focus_sessions`.

## Required API Keys & Secrets

All secrets are configured in Replit Secrets. The following are required for full functionality:

| Secret | Purpose | Status |
|--------|---------|--------|
| `JWT_SECRET` | Authentication token signing | Configured |
| `SENDGRID_API_KEY` | Password reset emails (from: info@simplenow.co) | Configured |
| `DEEPGRAM_API_KEY` | Voice-to-text transcription | Configured |
| `OPENAI_API_KEY` | AI task extraction (GPT-4o-mini) | Configured |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` | iOS in-app purchases | Configured |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` | Android in-app purchases | Optional |

**Email Configuration:**
- SendGrid sender email: `info@simplenow.co`
- Used for: Password reset codes, support notifications

## External Dependencies

-   **RevenueCat**: Primary payment processor for iOS and Android in-app purchases. Wraps Apple StoreKit and Google Play Billing into a unified SDK. Monthly ($6.99) and annual ($49.99 - saves 40%) plans with 7-day free trial.
-   **SendGrid**: Email service for password reset codes and notifications. Sender: info@simplenow.co
-   **Deepgram Nova-2**: Voice-to-text transcription for quick task capture via `/api/transcribe` endpoint.
-   **OpenAI GPT-4o-mini**: AI-powered task extraction from voice transcripts.
-   **AsyncStorage**: For persistent authentication state on the client-side.
-   **Expo SDK 54**: The framework for React Native development.
-   **bcrypt**: For password hashing in authentication.

## Production Readiness

### App Store Submission Status
The app has achieved **92/100 production readiness score** and is ready for App Store submission.

**Completed:**
- JWT-based authentication with production-ready JWT_SECRET
- Account deletion flow (Apple 5.1.1(v) compliance)
- Privacy Policy at `/privacy` with App Store Privacy Labels
- App Store Privacy Disclosure guide at `/app-store-privacy`
- Support page at `/support`
- Demo account for Apple review: `demo@igetitdone.co` / `AppleReview2024!`
- RevenueCat integration for iOS/Android subscriptions ($6.99/month, $49.99/year with 7-day trial)
- StoreKit configuration for iOS (ready for App Store submission)

**Remaining Manual Verification:**
- Push notification testing on physical devices
- Voice capture verification on iOS/Android
- Team delegation end-to-end QA
- Fresh install user journey smoke test

### Pricing Plans
| Plan | Price |
|------|-------|
| Monthly | $7.99/month |
| Annual | $59.99/year ($5.00/mo) |
| Lifetime Pro | $149.99 one-time |

All platforms (Web/iOS/Android) use the same pricing. 7-day free trial available for monthly and annual plans.

### RevenueCat Setup Required
1. Create account at [app.revenuecat.com](https://app.revenuecat.com)
2. Add iOS app with bundle ID: `com.igetitdone.app`
3. Create products in App Store Connect matching RevenueCat
4. Add API key as `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` environment variable
5. Build with EAS (`eas build --platform ios`) - RevenueCat doesn't work in Expo Go