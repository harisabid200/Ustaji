# 📱 Pre-APK Build Checklist

Based on skills: `expo-deployment`, `mobile-security-coder`, `production-code-audit`, `api-security-best-practices`, `firebase`, `security-hardening`, `performance-optimization`

---

## 🔴 Critical — ALL FIXED ✅

- `[x]` **Set EXPO_PUBLIC_API_URL** — `eas.json` now has Cloud Run URL for preview + production profiles
- `[x]` **Add React Error Boundary** — Created `ErrorBoundary.tsx`, wraps entire app in `App.tsx`
- `[x]` **Create `eas.json`** — Already existed, fixed empty API URL overrides
- `[x]` **Console statements** — Only 1 `console.warn` in a catch block — clean

## 🟡 Medium — ALL FIXED ✅

- `[x]` **ProfileScreen phone bug** — Changed `user?.phone` (undefined) → `user?.email`
- `[x]` **Unused imports** — Removed `TextInput`, `FlatList` from HomeScreen
- `[x]` **app.json config** — Added `android.package`, `bundleIdentifier`, `versionCode`, branded splash color
- `[x]` **npm audit** — Mobile: 4 moderate (metro bundler only, not in APK). Server: 8 low (firebase-admin transitive). No action needed.

## 🟡 Remaining — Needs User Action

- `[ ]` **EAS Project ID** — `app.config.js` line 39 has `'your-eas-project-id'`. Run `eas init` to set this.
- `[ ]` **Firestore security rules** — Verify rules in Firebase Console (can't check from here)

## 🟢 Nice to Have (Post-MVP)

- `[ ]` Move Firebase client config to env vars
- `[ ]` Add certificate pinning for API calls
- `[ ]` Add crash reporting (Sentry/Bugsnag)
- `[ ]` Bundle size optimization review
- `[ ]` Custom app icon and splash screen art
- `[ ]` App store metadata and screenshots

---

## ✅ Ready for APK Build

All blockers resolved. To build:
```bash
cd mobile
npx eas build --profile production --platform android
```

> [!IMPORTANT]
> Before running the build, you need to run `eas init` once to set the EAS project ID. This links your project to your Expo account.
