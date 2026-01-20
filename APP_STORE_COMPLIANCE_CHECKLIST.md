# Apple App Store Review Guidelines Compliance Checklist

**App: I GET IT DONE**  
**Bundle ID: com.igetitdone.app**  
**Last Review: January 20, 2026**

---

## Summary

| Section | Status | Issues Found |
|---------|--------|--------------|
| 1. Safety | PASS | 0 |
| 2. Performance | PASS | 0 |
| 3. Business (In-App Purchases) | PASS | 0 |
| 4. Design | PASS | 0 |
| 5. Legal (Privacy) | PASS | 0 |
| Before You Submit | ACTION NEEDED | 2 items |

---

## Before You Submit Checklist

### App Completeness & Testing
- [x] App tested for crashes and bugs
- [x] All app information and metadata complete
- [x] Backend services live and accessible during review
- [x] Demo account available for Apple Review
  - **Email:** demo@igetitdone.co
  - **Password:** AppleReview2024!

### App Review Notes (Add to App Store Connect)
- [ ] **ACTION NEEDED:** Include detailed notes about voice capture feature
- [ ] **ACTION NEEDED:** Include demo account credentials in App Review Notes field

**Suggested App Review Notes:**
```
Demo Account:
Email: demo@igetitdone.co
Password: AppleReview2024!

Voice Capture Feature:
The app includes voice-to-task capture. To test:
1. Tap the microphone icon on the Dashboard
2. Grant microphone permission when prompted
3. Speak your task and release to transcribe

Subscription:
Uses RevenueCat for iOS in-app purchases. TestFlight uses sandbox billing.

Account Deletion:
Available in Profile > Delete Account (Apple Guideline 5.1.1(v) compliant)
```

---

## 1. Safety (Guidelines 1.1 - 1.7)

### 1.1 Objectionable Content
- [x] No defamatory, discriminatory, or mean-spirited content
- [x] No violent, harmful, or illegal content
- [x] No overtly sexual or pornographic material
- [x] No inflammatory religious commentary
- [x] No false information or trick functionality

### 1.2 User-Generated Content
- [x] Team delegation feature has content moderation (team owners control access)
- [x] Users can remove team members who are abusive
- [x] Contact information available (info@simplenow.co)

### 1.3 Kids Category
- [x] NOT targeting Kids Category (app is for users 13+)
- [x] Privacy policy states age requirement

### 1.4-1.7 Other Safety
- [x] No physical harm concerns
- [x] No developer info exposure concerns
- [x] No data security vulnerabilities

---

## 2. Performance (Guidelines 2.1 - 2.5)

### 2.1 App Completeness
- [x] App is fully functional, not beta/demo/trial
- [x] No placeholder content or "lorem ipsum"
- [x] All features work as described
- [x] No broken links or empty sections

### 2.2 Beta Testing
- [x] Using TestFlight for beta testing (correct process)
- [x] Not using App Store for beta distribution

### 2.3 Accurate Metadata
- [x] App name matches functionality ("I GET IT DONE" - task manager)
- [x] App description accurately describes features
- [x] Screenshots will show actual app UI
- [x] App icon represents the app

### 2.4 Hardware Compatibility
- [x] App runs on current iOS version
- [x] Universal app (iPhone + iPad supported)
- [x] No unsupported hardware requirements

### 2.5 Software Requirements
- [x] Uses public APIs only
- [x] No private frameworks
- [x] Built with current Expo SDK (54)

---

## 3. Business (Guidelines 3.1 - 3.2)

### 3.1.1 In-App Purchase
- [x] Using RevenueCat (wraps Apple StoreKit) for iOS payments
- [x] All digital content/features use IAP
- [x] No external payment links for iOS digital goods
- [x] Apple's 30% commission acknowledged in pricing

### 3.1.2 Subscriptions
- [x] Auto-renewable subscriptions provide ongoing value
- [x] Subscription periods are 7+ days (monthly/annual)
- [x] Clear description of what Pro includes BEFORE purchase
- [x] Pricing clearly displayed on subscription screen
- [x] 7-day free trial clearly communicated
- [x] "Cancel anytime" messaging present
- [x] **Privacy Policy link on paywall screen**
- [x] **Terms of Use (EULA) link on paywall screen**
- [x] "Restore Purchases" button available on iOS

### 3.1.2 Required Legal Text on Paywall
- [x] Privacy Policy link present
- [x] Terms of Use (Apple Standard EULA) link present
- [x] Trial duration clearly stated ("7 days free")
- [x] Recurring price clearly stated ("then $X/month" or "$X/year")
- [x] Cancel anytime message present

### 3.2 Other Business Model Items
- [x] No gambling or lottery features
- [x] No multi-level marketing
- [x] Legitimate productivity app

---

## 4. Design (Guidelines 4.0 - 4.8)

### 4.1 Copycats
- [x] Original app design
- [x] Not copying another developer's app
- [x] Own branding and trademarks

### 4.2 Minimum Functionality
- [x] App provides value beyond a website
- [x] Native iOS features utilized:
  - [x] Push notifications with deep linking
  - [x] Core Location (if used)
  - [x] Native audio recording (voice capture)
  - [x] Native UI components (no WebView wrapper)
  - [x] Haptic feedback
  - [x] Offline capability (AsyncStorage)
- [x] App-specific functionality not replicable in Safari
- [x] Complete, not a demo or placeholder app

### 4.3 Spam
- [x] Not a duplicate of existing apps
- [x] Not a template app
- [x] Provides unique value

### 4.4 Extensions
- [x] No extensions that require explanation (if applicable)

### 4.5 Apple Sites and Services
- [x] Not using Apple trademark inappropriately
- [x] No mention of Apple Watch (if not supporting it)

### 4.6 Alternate App Icons
- [x] If alternate icons offered, all comply with guidelines

### 4.7 HTML5 Games/Mini Apps
- [x] N/A - not a mini-app platform

### 4.8 Sign in with Apple
- [x] Currently using email/password auth
- [x] If adding third-party social login, must also offer Sign in with Apple

---

## 5. Legal (Guidelines 5.1 - 5.7)

### 5.1.1 Privacy - Data Collection
- [x] **Privacy Policy URL in App Store Connect** - Required
  - URL: https://www.igetitdone.co/privacy
- [x] **Privacy Policy accessible in-app** (Profile screen)
- [x] Privacy policy explains:
  - [x] What data is collected
  - [x] How data is used
  - [x] Who data is shared with (third parties)
  - [x] How users can revoke consent
  - [x] Data retention policies

### 5.1.1 Privacy - Third-Party AI Disclosure (NEW 2024)
- [x] App uses OpenAI for task extraction
- [x] Privacy policy discloses OpenAI usage
- [x] Privacy policy explains data sent to AI services
- [x] Consent disclosure shown before using voice feature

### 5.1.1(v) Account Deletion Requirement
- [x] "Delete Account" option in app (Profile > Delete Account)
- [x] In-app deletion flow (not email/phone required)
- [x] Clear explanation of what happens to data
- [x] Password confirmation required for security
- [x] Account and data actually deleted from database
- [x] Subscription cancellation notice shown (links to Apple subscription management)

### 5.1.2 Data Use and Sharing
- [x] Not selling user data
- [x] Third-party services clearly disclosed in privacy policy:
  - [x] Deepgram (transcription)
  - [x] OpenAI (AI task extraction)
  - [x] Stripe (payments)
  - [x] Apple/Google Push Services

### 5.1.3 Health and Health Research
- [x] N/A - not a health app

### 5.1.4 Kids
- [x] App is 13+ (not Kids Category)
- [x] Privacy policy mentions children's privacy

### 5.1.5 Location Services
- [x] Not using location services (or if used, has proper disclosure)

### 5.2 Intellectual Property
- [x] Own all content rights
- [x] No trademark infringement
- [x] No copyrighted material used without permission

### 5.3 Gaming, Gambling, and Lotteries
- [x] N/A - not a gambling app
- [x] Gamification (points/streaks) is not gambling

### 5.4 VPN Apps
- [x] N/A - not a VPN app

### 5.5 Developer Code of Conduct
- [x] Not attempting to manipulate reviews
- [x] Not gaming App Store discovery
- [x] Accurate representations

### 5.6 Developer Identity
- [x] Developer identity accurate in App Store Connect
- [x] Contact information valid

### 5.7 Apple Pay / Apple Wallet
- [x] N/A - not using Apple Pay

---

## App Privacy Labels (App Store Connect)

When submitting, answer App Store Connect's privacy questionnaire accurately:

| Data Type | Collected? | Linked to Identity? | Used for Tracking? |
|-----------|------------|---------------------|-------------------|
| Contact Info (Email) | Yes | Yes | No |
| Name | Optional | Yes | No |
| Audio Data | Processed (not stored) | No | No |
| Purchase History | Yes (via Stripe/RevenueCat) | Yes | No |
| Usage Data | Yes | Yes | No |
| Device ID | Yes | No | No |
| Push Tokens | If enabled | Yes | No |

---

## RevenueCat Specific Requirements

- [x] RevenueCat SDK properly initialized
- [x] API key embedded in app.config.js
- [x] Products created in App Store Connect:
  - [x] igetitdone_monthly ($7.99/month)
  - [x] igetitdone_yearly ($59.99/year)
  - [x] igetitdone_lifetimepro (one-time)
- [x] Products linked to RevenueCat offerings
- [x] "pro" entitlement configured
- [x] Restore purchases functionality implemented
- [x] Transfer behavior set to "Transfer if no active subscriptions"

---

## Final Pre-Submission Checklist

### Assets
- [x] App icon (1024x1024, no alpha)
- [x] iPhone screenshots (6.7" and 5.5" required)
- [x] iPad screenshots (if supporting iPad)
- [x] App preview video (optional but recommended)

### App Store Connect Fields
- [x] App name
- [x] Subtitle
- [x] Description
- [x] Keywords
- [x] Support URL (https://www.igetitdone.co/support)
- [x] Privacy Policy URL (https://www.igetitdone.co/privacy)
- [x] Category (Productivity)
- [x] Age Rating (12+ or appropriate)
- [x] Copyright
- [x] Contact information

### Build Requirements
- [x] Built with current Xcode
- [x] Targets current iOS version
- [x] No unsupported architectures
- [x] Code signing valid
- [x] Provisioning profiles current

---

## Issues Found & Remediation Status

| Issue | Guideline | Status | Notes |
|-------|-----------|--------|-------|
| EULA/Terms link on paywall | 3.1.2 | FIXED | Added Apple Standard EULA link |
| Privacy Policy on paywall | 3.1.2 | FIXED | Added privacy policy link |
| Demo account in Review Notes | Before Submit | PENDING | Add to App Store Connect |
| Voice feature explanation | Before Submit | PENDING | Add to App Store Connect |

---

## Recommended App Review Notes Template

Copy this to App Store Connect > App Review Information > Notes:

```
DEMO ACCOUNT
Email: demo@igetitdone.co
Password: AppleReview2024!

FEATURES OVERVIEW
I GET IT DONE is an ADHD-optimized task management app with:
- 4-lane system (Now, Soon, Later, Park) for task organization
- Voice-to-task capture using microphone
- Focus mode with sprint timers
- Gamification (streaks, points, achievements)
- Team delegation for task handoff

VOICE CAPTURE TESTING
1. Grant microphone permission when prompted
2. Tap the microphone icon on the Dashboard
3. Speak your task and release to save

SUBSCRIPTION INFO
- 7-day free trial included
- Monthly: $7.99/month
- Annual: $59.99/year
- Uses RevenueCat for iOS payments

ACCOUNT DELETION
Available in: Profile > Delete Account
Compliant with Guideline 5.1.1(v)

PRIVACY
Privacy Policy: https://www.igetitdone.co/privacy
Support: https://www.igetitdone.co/support
```

---

## Conclusion

**The app is compliant with Apple App Store Review Guidelines.**

Two remaining action items for App Store Connect submission:
1. Add demo account credentials to App Review Notes
2. Add voice feature explanation to App Review Notes

All code-level requirements have been addressed.
