# I GET IT DONE - iOS Build & Submit Guide

## Your Account Info
- **Apple ID**: simplenowapps@gmail.com
- **Apple Team ID**: 8HS544W74B (Troy Evans - Individual)
- **Expo Account**: simplenow
- **Bundle ID**: com.igetitdone.app
- **App Store Connect App ID**: 6756545884

---

## Step 1: Download the Latest Code from Replit
1. Go to your Replit project
2. Click the three dots menu → Download as zip
3. Unzip the downloaded folder

---

## Step 2: Open Terminal and Navigate to Project
```bash
cd "/Users/troyevans/Downloads/I-Get-It-Done 6"
```
(Adjust the folder name/number as needed)

---

## Step 3: Install Dependencies
```bash
npm install
```

---

## Step 4: Build for iOS
```bash
npx eas build --platform ios
```
- This uses your saved credentials (no password needed)
- Wait 10-20 minutes for the build to complete
- You'll get a link to track progress

---

## Step 5: Submit to App Store
```bash
npx eas submit --platform ios --latest
```
- This uses your API key (no password needed)
- Wait for "Submission successful" message

---

## Step 6: TestFlight Testing
1. Go to [App Store Connect](https://appstoreconnect.apple.com/apps/6756545884)
2. Click **TestFlight** tab
3. Wait for the new build to finish processing (5-15 min)
4. Install on your iPhone via TestFlight app
5. Test all features

---

## Step 7: Submit for Apple Review
1. Go to **Distribution** tab in App Store Connect
2. Scroll to **Build** section
3. Click **Select a build** and choose your new build
4. Click **Add for Review** (blue button)
5. Answer any compliance questions
6. Submit

---

## Demo Account for Apple Review
Include these in your App Review Information:
- **Email**: demo@igetitdone.co
- **Password**: AppleReview2024!

---

## Troubleshooting

### "EAS project not configured" error
The `app.config.js` already has the project ID configured:
```javascript
eas: {
  projectId: "99ad023f-5394-483a-8bf9-8c7e330ddfc8"
}
```

### "Cannot read properties of undefined" error
The `eas.json` has your App Store Connect ID configured:
```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6756545884"
    }
  }
}
```

### Need to reset credentials
```bash
npx eas credentials --platform ios
```

### Check build status
```bash
npx eas build:list --platform ios --limit 5
```

---

## RevenueCat Products (for reference)
- Monthly: `igetitdone_monthly` - $7.99
- Yearly: `igetitdone_yearly` - $59.99
- Lifetime: `igetitdone_lifetimepro` - $99.99
- Entitlement: `pro`
- API Key: `appl_CPNXVAxovCuYXnNbLvxpjNFqBdq`
