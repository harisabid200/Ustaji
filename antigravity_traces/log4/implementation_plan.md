# UstaJi Mobile UI/UX Overhaul

**Platform:** React Native (Expo) · iOS + Android + Web  
**Framework:** Cross-platform → both `platform-ios.md` + `platform-android.md` apply  
**Guiding skills:** `mobile-design`, `touch-psychology`

---

## 🧠 Mobile Checkpoint

```
Platform:   iOS + Android + Web
Framework:  React Native (Expo)
Files Read: SKILL.md, touch-psychology.md

3 Principles:
1. Primary CTAs in thumb zone (bottom). Min 48px hit targets.
2. One primary action per screen. Progressive disclosure for secondary info.
3. No text overflow — flexShrink + numberOfLines on all variable-length strings.

Anti-Patterns to Avoid:
1. Text overflowing card bounds (fix with flex:1 + numberOfLines)
2. Bottom tab bar clipping tab labels (fix with correct height + paddingBottom for safe area)
```

---

## Issues Identified (Audit Summary)

### 🔴 Critical Bugs

| Location | Issue |
|----------|-------|
| **UserTabs / ProviderTabs** | `height: 72` is hardcoded — on iPhone with home indicator (34pt safe area) bottom is clipped. Must use `useSafeAreaInsets` |
| **ProviderTabs TabIcon** | Not applying `tabIconFocused` style — focused state is invisible (no highlight) |
| **ProviderCard** | `rightActions` row has no `flex:1` constraint on parent. On narrow screens "Available" badge + Select button overflow the card. Missing `flexShrink` |
| **PricingCard** | `headerTitle` uses `COLORS.brand.amberLight` = `#FEF3C7` (yellow text on white bg) — nearly invisible. Wrong color. |
| **AgentTraceCard** | References `trace.thought`, `trace.result`, `trace.action` but the server sends `observation`, `decision`, `step` — component shows empty strings |
| **ChatBubble** | `maxWidth: '80%'` on the wrapper but no `flexShrink` on message text — long unbroken strings (URLs, Urdu words) can still overflow |
| **ChatInput quickReplies** | `flexWrap: 'wrap'` but no `maxHeight` — when 4+ chips wrap to 2 rows the input area becomes very tall, pushing send button out of thumb zone |
| **ChatScreen offline banner** | Uses hardcoded `fontFamily: 'monospace'` which may not exist on all Android devices |

### 🟡 Design Issues

| Location | Issue |
|----------|-------|
| **Tab bars (both)** | Emoji icons at 22px — too small. No indicator pill on active tab (no visual feedback) |
| **HomeScreen categories grid** | `width: '47%'` with `flexWrap` — on web/tablet cards are very wide. Need fixed `minWidth`/`maxWidth` |
| **HomeScreen** | AI CTA subtitle can wrap badly since `aiCtaLeft` has `flex:1` but the text container doesn't |
| **BookingDetailScreen** | `backBtn` is only 40×40 (below 44px minimum). Also header title can overflow on small screens |
| **ProviderDashboard oppCard** | `oppService` has no `numberOfLines` — long service names push `matchBadge` off screen |
| **ProviderDashboard statCard** | `width: '47%'` but no `minHeight` — earnings value "Rs. 12,000" and "—" have different visual weights |

### 🟢 Quick Wins

- ChatInput `sendBtn` is exactly 44×44 ✅ but lacks `paddingHorizontal` for hit area extension
- BookingDetailScreen cancel/primary buttons are correct height ✅
- ProviderCard `selectBtn` has `minHeight: 36` — too short (should be min 44)

---

## Proposed Changes

### 1. Tab Bar Safe Area + Active Indicator (Both Navigators)

#### [MODIFY] UserTabs.tsx
- Import `useSafeAreaInsets` and add `paddingBottom: insets.bottom + 8` dynamically
- Wrap `tabBarStyle` in a function: `tabBarStyle: (state) => dynamicTabBar(insets)`
- Add a green pill indicator beneath the active tab icon
- Increase emoji size to 24, touch target to full tab width × 56px minimum

#### [MODIFY] ProviderTabs.tsx
- Same safe area fix
- Fix `tabIconFocused` style actually applied
- Consistent pill indicator

### 2. Fix AgentTraceCard field mapping

#### [MODIFY] AgentTraceCard.tsx
- Server sends `observation`, `decision`, `step` — map these correctly
- `trace.action` (shown as "Action summary") → use `trace.decision`
- `trace.thought` → use `trace.observation`
- `trace.result` → use `trace.reasoning` (JSON.stringify condensed)

### 3. Fix PricingCard color

#### [MODIFY] PricingCard.tsx
- `headerTitle` color: `COLORS.brand.amberLight` (#FEF3C7 = near-white) → change to `COLORS.brand.amber` (#F59E0B = readable amber)

### 4. Fix ProviderCard overflow + selectBtn size

#### [MODIFY] ProviderCard.tsx
- `nameBlock`: add `paddingRight: SPACING.sm` so it doesn't crowd the badge
- `selectBtn`: change `minHeight: 36` → `minHeight: 44` (WCAG minimum)
- `bottomRow`: add `flexWrap: 'wrap'` + `gap: SPACING.xs`
- `name`: add `numberOfLines={2}` + `flexShrink: 1`

### 5. Fix ChatBubble text overflow

#### [MODIFY] ChatBubble.tsx
- `messageText`: add `flexShrink: 1` and keep `lineHeight: 22`
- Wrap bubble content view with `overflow: 'hidden'`

### 6. Fix ChatInput quick replies overflow

#### [MODIFY] ChatInput.tsx
- Add `maxHeight: 88` to `quickReplies` container + `ScrollView` horizontal for overflow
- Change quick reply row from `flexWrap` to a horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}` — clean single-row scrollable chips

### 7. Fix HomeScreen layout issues

#### [MODIFY] HomeScreen.tsx
- `aiCtaSubtitle`: add `flexShrink: 1` to the text container view
- `categoryCard`: change `width: '47%'` → explicit calculation using `Dimensions` for 2-column grid that respects padding properly
- `bookingCard`: add `numberOfLines={1}` to service name + provider name

### 8. Fix BookingDetailScreen backBtn size + header overflow

#### [MODIFY] BookingDetailScreen.tsx
- `backBtn`: `width: 40, height: 40` → `width: 44, height: 44`
- `title`: add `flex: 1, textAlign: 'center', numberOfLines: 1`
- Header: add `maxWidth` constraint so ID doesn't push title

### 9. Fix ProviderDashboard overflow

#### [MODIFY] ProviderDashboardScreen.tsx
- `oppService`: add `numberOfLines={1}` + `flex: 1` in the `oppHeader` row
- `statCard`: add `minHeight: 96` for visual consistency

### 10. ChatScreen — Polish

#### [MODIFY] ChatScreen.tsx
- Fix offline banner `fontFamily` to use platform-safe `Platform.select`
- Add `KeyboardAvoidingView` behavior: `padding` on iOS, `height` on Android (already present but verify)

---

## Verification Plan

### After Each Change
- `npx tsc --noEmit` — ensure no TypeScript errors

### Manual (Browser Preview)
- Open Expo web preview, test: home → chat flow → booking detail
- Check: tab bar not clipped, no text overflow, active tab indicator visible
- Check: provider card renders cleanly on narrow (375px) and wide (414px) widths
- Check: pricing card header text readable

### Touch Target Verification
- All interactive elements ≥ 44px height ✅
- Tab items full-width touch targets ✅
- Back buttons 44×44 ✅
