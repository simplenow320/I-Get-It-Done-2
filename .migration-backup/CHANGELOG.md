# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-12-11

### Security

- **CRITICAL**: Removed password logging from authentication endpoints
  - Register endpoint no longer logs plain-text passwords
  - Login endpoint no longer logs plain-text passwords
  - This prevents credential exposure in server logs

### Added

- **Account Deletion Feature** (App Store Compliance)
  - New DELETE /api/account/:userId API endpoint
  - Password verification required before deletion
  - Cascading deletion of all user data
  - UI button in Profile screen
  - Confirmation modal with password re-entry
  - Compliant with Apple Guideline 5.1.1(v)

- **Pre-Deployment Audit**
  - AUDIT_REPORT.md - Comprehensive security and compliance review
  - FIXES_APPLIED.txt - Summary of changes made
  - MANUAL_REVIEW_NEEDED.txt - Items requiring human verification
  - CHANGELOG.md - This file

### Changed

- Profile screen now includes account management section with:
  - User email display
  - Sign Out button
  - Delete Account button with confirmation flow

---

## [0.9.0] - 2025-12-08

### Added

- Full 2-sided delegation system
  - Team Hub for task management
  - Delegatee Dashboard for assigned tasks
  - Invite code generation and redemption
  - Status tracking (pending → accepted → completed)

- Voice-to-task capture
  - Deepgram API for transcription
  - OpenAI for intelligent task extraction
  - Web fallback with helpful message

- Push notification reminders
  - Local notifications for task reminders
  - Background task scheduling

### Security

- Custom email/password authentication
- bcrypt password hashing
- Session persistence with AsyncStorage

---

## [0.8.0] - 2025-12-08

### Added

- Gamification system
  - Streak tracking
  - Points/XP system
  - Level progression
  - Achievement unlocks

- Enhanced Weekly Reset
  - Wins display
  - Cleanup suggestions
  - Future planning
  - Gamification stats integration

---

## [0.7.0] - 2025-12-08

### Added

- Focus Mode with sprint timer
- Break It Down (subtask management)
- Progress ring visualization
- Quick Dump brain dump feature

---

## [0.6.0] - 2025-12-08

### Added

- 4-lane task system (Now/Soon/Later/Park)
- Auto-lane movement for overdue tasks
- Task creation and editing
- PostgreSQL cloud sync

---

## [0.5.0] - 2025-12-08

### Added

- Initial app setup
- User authentication (login/register)
- Onboarding flow
- Theme support (light/dark/system)
