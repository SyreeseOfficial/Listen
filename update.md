# Listen — Full App Reference

> This file is the single source of truth for a new AI session. Read this before touching any code.

---

## What Is Listen

Listen is a **listening session tracker** built for audiophiles and intentional listeners. The core loop: pick a duration → go through a "Set the scene" pre-session screen → run a countdown timer → log the session on a completion screen. Sessions build XP, streaks, and achievements. The app has a freemium monetization model ($7.99 one-time purchase).

---

## Tech Stack

- **Framework**: React Native + Expo SDK 54
- **Routing**: Expo Router (file-based, same as Next.js App Router)
- **Language**: TypeScript throughout
- **State**: Local `useState` + `AsyncStorage` (no Redux/Zustand)
- **Persistence**: `@react-native-async-storage/async-storage`
- **Key libraries**: `expo-notifications`, `expo-haptics`, `expo-keep-awake`, `expo-file-system`, `expo-sharing`, `react-native-view-shot`, `react-native-gesture-handler`
- **Install flag**: Always use `npm install --legacy-peer-deps` — peer dep conflicts exist and this flag is required every time

---

## Project Structure

```
app/
  _layout.tsx              Root Stack (wraps all screens)
  (tabs)/
    _layout.tsx            Bottom tab navigator (Home, History, Stats, Profile)
    index.tsx              Home screen — duration picker, insight cards, weekly goal
    history.tsx            Session history — filter/sort/search/edit/share
    stats.tsx              Stats — bar chart, heatmap, leaderboard, archetype
    profile.tsx            Settings modal — theme, gear, notifications, export, about
  onboarding/
    welcome.tsx            Step 0 — splash entry
    listener-type.tsx      Step 1 — how they describe themselves
    goal.tsx               Step 2 — what they want from listening
    frequency.tsx          Step 3 — how often per week (casual/regular/daily)
    session-length.tsx     Step 4 — default session length
    what-you-listen-to.tsx Step 5 — music / podcasts / etc.
    name.tsx               Step 6 — user's name
    commitment.tsx         Step 7 — saves weeklyCommitment (2/4/7 days)
    building-profile.tsx   Animated loading screen
    archetype-reveal.tsx   Shows computed listener archetype
    social-proof.tsx       Fake social proof screen
    notifications.tsx      Request notification permission
    theme.tsx              Pick light/dark/system
    equipment.tsx          Add gear items (free limit: 3)
    paywall.tsx            Redirects to /paywall?from=onboarding
    downsell.tsx           Free tier acknowledgement (after declining paywall)
  paywall.tsx              Canonical paywall modal (context-aware via ?from=onboarding)
  session.tsx              Live countdown timer with background correction
  pre-session.tsx          "Set the scene" — tips, gear selection, intention picker
  complete.tsx             Post-session screen — XP toast, log session, freeze/goal banners
  welcome-home.tsx         First-time landing after onboarding

utils/
  storage.ts               All AsyncStorage CRUD (sessions, profile, pendingSession)
  stats.ts                 computeStats() — streak, totals, shields consumed
  xp.ts                    XP calculation, level info, achievement checking
  haptics.ts               Wrapper: impact(), selection(), notification(), heavy()
  notifications.ts         Schedule daily reminder, weekly recap, streak risk
  export.ts                CSV export via expo-file-system + expo-sharing
  engagement.ts            Fake social proof, archetypes, leaderboard, ego fuel
  social.ts                Fake social cards for home screen

constants/
  theme.ts                 Colors (light/dark), ACCENT_THEMES
  achievements.ts          Achievement definitions
  discoveries.ts           Random listener insight quotes
  timeBadges.ts            Weekly rotating badge definitions

components/
  XpToast.tsx              Animated XP gain toast (level-up aware)
  SessionShareCard.tsx     Shareable session card (react-native-view-shot target)

context/
  ThemeContext.tsx          Global theme — isDark, colors, accentTheme, setPref, setAccentTheme
```

---

## Navigation Flow

**Onboarding** (first launch, `onboardingDone = false`):
`welcome → listener-type → goal → frequency → session-length → what-you-listen-to → name → commitment → building-profile → archetype-reveal → social-proof → notifications → theme → equipment → /paywall?from=onboarding → downsell → /welcome-home`

**Main app** (tabs):
`(tabs)/index` is Home. Tapping "Begin Session" → `/pre-session` → `/session` → `/complete` → back to `/(tabs)`.

`/paywall` is a modal in the root Stack, pushed from anywhere. On dismiss it calls `router.back()` unless it was opened from onboarding (uses `router.replace('/onboarding/downsell')`).

---

## Data Model

### `UserProfile` (stored in AsyncStorage under key `'profile'`)

```ts
{
  name: string;
  theme: 'light' | 'dark' | 'system';
  equipment: string[];              // e.g. ["Headphones: Sony WH-1000XM5"]
  onboardingDone: boolean;
  streakShields: number;            // display name: "streak freezes" — UI text renamed, key unchanged
  lastShieldStreak: number;         // streak value when last freeze was awarded
  xp: number;
  achievements: string[];           // achievement IDs already earned
  defaultSessionMinutes?: number;
  hapticsEnabled?: boolean;
  weekStartsOn?: 'monday' | 'sunday';
  listenerType?: string;
  listeningGoal?: string;
  listeningFrequency?: string;
  listeningStyle?: string;
  weeklyCommitment?: number;        // days/week goal (2, 4, or 7) — set in onboarding commitment step
  notificationsEnabled?: boolean;
  notificationHour?: number;        // hour for daily reminder (0-23)
  autoComplete?: boolean;           // auto-finish session when timer hits 0
  isPremium?: boolean;              // placeholder — replace with real StoreKit receipt verification
  accentTheme?: string;             // key from ACCENT_THEMES (default: 'default')
}
```

### `Session` (stored in AsyncStorage under key `'sessions'`, array newest-first)

```ts
{
  id: string;                  // Date.now().toString()
  duration: number;            // seconds elapsed (not the target — actual time)
  completedAt: string;         // ISO string
  completed: boolean;
  equipmentUsed?: string[];
  rating?: number;             // 1–5 stars
  album?: string;              // "What did you listen to?" field
  notes?: string;              // free text notes / reflection
  intention?: string;          // Deep Listen mode: 'enjoy'|'critical'|'relax'|'focus'|'discover'
}
```

### `PendingSession` (stored under key `'pendingSession'`)

Saved on session mount + every background event. Checked on home screen mount for kill→resume flow.

```ts
{
  sessionId: string;
  minutes: string;
  totalSeconds: number;
  remainingSeconds: number;
  equipment: string;   // JSON stringified string[]
  savedAt: string;     // ISO string — used to calculate elapsed time since save
}
```

---

## Storage API (`utils/storage.ts`)

```ts
getSessions(): Promise<Session[]>
saveSession(session: Session): Promise<void>           // prepends (newest first)
updateSession(id, partial): Promise<void>
deleteSession(id): Promise<void>
getProfile(): Promise<UserProfile | null>
saveProfile(profile: UserProfile): Promise<void>
updateProfile(partial: Partial<UserProfile>): Promise<void>
savePendingSession(s: PendingSession): Promise<void>
getPendingSession(): Promise<PendingSession | null>
clearPendingSession(): Promise<void>
```

---

## Theme System (`context/ThemeContext.tsx`)

`useTheme()` returns:
- `colors` — full color set with `colors.accent` dynamically overridden by `accentTheme`
- `pref` — 'light' | 'dark' | 'system'
- `setPref(pref)` — saves to profile
- `isDark` — boolean
- `accentTheme` — current accent theme key
- `setAccentTheme(key)` — saves to profile, updates colors

Color tokens: `colors.text`, `colors.textSecondary`, `colors.accent`, `colors.border`, `colors.card`, `colors.background`, `colors.tabBar`, `colors.tabBarBorder`

### Accent Themes (`constants/theme.ts` → `ACCENT_THEMES`)

| Key | Label | Light | Dark |
|-----|-------|-------|------|
| default | Sand | #9B7E5A | #C8A97A |
| amber | Amber | #C07820 | #E8A030 |
| sage | Sage | #4E7A52 | #6EA074 |
| rose | Rose | #A84F5E | #C87082 |
| slate | Slate | #3E6080 | #5E88AA |
| terra | Terra | #A85030 | #C87050 |

`default` (Sand) is free. All others require Pro. Locked swatches show at 0.45 opacity.

---

## XP System (`utils/xp.ts`)

**Session XP** (awarded immediately on complete):
- Base: ~1 XP/minute
- Streak multiplier: 1x at 0 days, increases with streak length
- `calcSessionXp(durationSeconds, completed, currentStreak)` returns event array
- `totalXp(events)` sums them

**Post-session XP** (awarded in `handleDone()` on complete screen):
- Rating: +15 XP
- Album logged: +10 XP
- Notes written: +20 XP
- `calcPostSessionXp(rating, album, notes)` returns event array

**Weekly goal bonus**: +50 XP when completed sessions this week === `weeklyCommitment`. Fires exactly on the goal-completing session. Handled in `complete.tsx → onLoad()`.

**Leveling**: `getLevelInfo(xp)` returns `{ level, title, progress, nextLevelXp }`. Free users display is capped at Level 3 (XP still accrues — real level shows on upgrade).

**Achievements**: `checkAchievements(sessions, profile, stats)` returns newly earned achievements. Called in `complete.tsx`. Each achievement has `id`, `icon`, `title`, `description`, `xpReward`.

**Streak freezes**: Earned automatically every time streak hits a multiple of 4 (and `currentStreak > lastShieldStreak`). Stored in `profile.streakShields`. Display text is "streak freezes" everywhere — the storage field name `streakShields` was NOT renamed to avoid breaking existing data.

---

## Stats System (`utils/stats.ts`)

```ts
computeStats(sessions: Session[], shields = 0): Stats
// Returns: { totalSeconds, sessionsCompleted, weekSeconds, currentStreak, longestStreak, avgSeconds, shieldsConsumed }
```

Streak calculation (`calcStreak`): walks sessions newest-to-oldest, consumes shields on missed days.

---

## Notifications (`utils/notifications.ts`)

**CRITICAL**: `expo-notifications` must be **statically imported** at the top of the file. Dynamic `require()` inside try/catch breaks Metro bundler with "Got unexpected undefined". All API calls are wrapped in try/catch for Expo Go compatibility.

Functions:
- `requestPermission()` → `boolean`
- `scheduleDailyReminder(hour)` — tag: `'daily-reminder'`, repeating daily
- `scheduleWeeklyRecap()` — tag: `'weekly-recap'`, repeating weekly on Monday 10am
- `scheduleStreakRiskTonight(hour?)` — tag: `'streak-risk'`, one-shot tonight at `hour` (default 21). Only schedules if current time < target. Replaces any existing streak-risk notification.
- `cancelStreakRiskNotification()` — cancels streak-risk only
- `cancelAllListenNotifications()` — cancels all three tags

**Scheduling logic**:
- `scheduleStreakRiskTonight` is called from `home/index.tsx` `useFocusEffect` if `notificationsEnabled` and no session exists today
- `cancelStreakRiskNotification` is called from `complete.tsx` on successful session completion

---

## Session Flow (Technical)

### pre-session → session → complete params

`pre-session.tsx` → `router.replace('/session', { minutes, equipment: JSON.stringify([...]), intention: 'enjoy' | '' })`

`session.tsx` → `router.replace('/complete', { minutes, completed: '0'|'1', sessionId, equipment, intention })`

### Background timer (`session.tsx`)

- `AppState` listener records `backgroundAtRef.current = Date.now()` on background
- On foreground return: `elapsed = (Date.now() - backgroundAt) / 1000`, snaps timer
- Wall-clock approach — immune to JS throttling in background
- `pausedRef` kept in sync via `useEffect([paused])` to avoid stale closure in AppState handler

### Kill → Resume flow

1. `session.tsx` saves `PendingSession` on mount and every background event
2. `session.tsx` `finish()` calls `clearPendingSession()` before saving session
3. `home/index.tsx` one-time `useEffect([], [])` checks `getPendingSession()`, prompts Resume/Discard alert
4. Resume: `router.push('/session', { minutes, equipment, resumeRemaining, resumeTotal, sessionId })`

---

## Monetization

**Model**: $7.99 one-time purchase (freemium). Currently implemented as `isPremium: boolean` in UserProfile. **TODO**: Replace with real StoreKit 2 (iOS) / Google Play Billing (Android) receipt verification.

**Dev testing**: `__DEV__`-only toggle in the Settings modal ("DEV: Switch to Pro/Free") flips `isPremium` instantly. Hidden in production builds.

### Premium Features (gated)

| Feature | Gate location |
|---------|--------------|
| Stats — Month/All-Time periods | `stats.tsx` period toggle |
| Unlimited streak freezes (free: max 1 displayed) | `stats.tsx` freeze row |
| Session notes in history edit | `history.tsx` edit form |
| Session share card | `history.tsx` share button |
| Custom notification time chips | `profile.tsx` settings modal |
| Gear entries beyond 3 | `profile.tsx` add gear button |
| Level display beyond Level 3 | `profile.tsx` level row |
| Color accent themes (all except Sand) | `profile.tsx` swatch picker |
| Calendar heatmap | `stats.tsx` heatmap section |
| Full session history (free: 5 most recent) | `history.tsx` FlatList footer |
| CSV export | `profile.tsx` export button (visible to all — greyed + 🔒 for free) |

---

## Deep Listen Mode

Optional intention picker on the pre-session screen. Five chips:
`enjoy (🎵)`, `critical (🔍)`, `relax (😌)`, `focus (💪)`, `discover (✨)`

Tap to select one, tap again to deselect. Completely optional — "I'm ready" works with no selection.

Intention flows: `pre-session → /session?intention=enjoy → saveSession({ ..., intention: 'enjoy' }) → /complete?intention=enjoy`

On `complete.tsx`:
- Shows "INTENTION" card with the display label
- Notes field relabels to "What did you notice?" when intention is set
- Placeholder text changes to "Anything that stood out"

---

## Weekly Goal

`weeklyCommitment` (2/4/7 days) is set in the **commitment** onboarding step (step 7/7). Already in the flow — no separate onboarding step needed.

Home screen shows a progress bar widget above the insight cards: `"WEEKLY GOAL  ·  3/4 days ✓"`.

On `complete.tsx`: if this session makes `sessionsThisWeek === weeklyCommitment`, awards +50 XP bonus and shows `"🎯 Weekly goal reached — +50 XP bonus"` banner.

"This week" = Monday–Sunday (Monday as start of week).

---

## Calendar Heatmap (Stats, Pro)

18 weeks × 7 days grid in `stats.tsx`. Cells are auto-sized based on screen width:
`HEATMAP_CELL = floor((screenWidth - 48 - 17 * 2) / 18)`

- Session days: `colors.accent` at full opacity
- No-session days: `colors.accent + '22'` (faint)  
- Future days: transparent
- Today: `colors.accent` border ring

Month labels appear above the column when a new month starts. Legend row below: "Less ●●●●● More".

Free users see a locked card: "🔒 See your full listening history as a calendar heatmap · Unlock with Pro →"

---

## Home Screen Insight Cards

Horizontal scrollable card strip. Cards built in `load()` inside `useFocusEffect`:
1. Streak XP bonus (active streak) OR streak resurrection (lost streak)
2. Regret injection (missed yesterday)
3. Grief (days without listening, fallback if no regret card)
4. Hot hand (last session rated 4+ within 48h)
5. Parasocial buddy (personalized fake friend)
6. Social obligation (fake social card)
7. Sunk cost (total time invested)
8. Weekly rotating badge

All social proof and engagement numbers are **fake/seeded** — the app has no backend. This is intentional (engagement psychology).

---

## Engagement Utilities (`utils/engagement.ts`)

- `computeArchetype(sessions)` — returns listener archetype based on session patterns
- `getEgoFuel(stats)` — complimentary string about user's stats
- `getMilestone(stats)` — "next milestone" string
- `getPhantomInsights(sessions)` — "AI" insights after 15+ sessions (fabricated)
- `getFakeLeaderboard(level, name)` — seeded fake leaderboard
- `getFakeGlobalRank(seed)` — fake rank + percentile
- `getFakeListenerCount()` — fluctuating fake "listening now" count
- `getRegretInjection(sessions, xp)` — missed-yesterday regret string
- `getParasocialBuddy(name, streak)` — fake named accountability partner

---

## CSV Export (`utils/export.ts`)

Uses `expo-file-system` (write to `cacheDirectory`) + `expo-sharing` (native share sheet).
8 columns: Date, Time, Duration, Completed, Rating, Listened To, Notes, Equipment.
Visible to all users — greyed 40% opacity + 🔒 icon for free users, taps to `/paywall`.

---

## Known Gotchas & Constraints

1. **expo-notifications**: Must be `import * as Notifications from 'expo-notifications'` at the TOP of the file. Never use dynamic `require()` inside try/catch — Metro can't resolve it and crashes with "Got unexpected undefined". All API calls go inside try/catch.

2. **`--legacy-peer-deps`**: Every `npm install` must use this flag. Forced installs can evict transitive deps — always pin needed packages explicitly in `package.json` and run bare `npm install --legacy-peer-deps` after.

3. **Apostrophes in JSX strings**: `'I've'` breaks the JS parser. Use double quotes for any string containing an apostrophe: `"I've"`.

4. **VirtualizedList inside ScrollView**: Don't nest FlatList inside ScrollView. Use a plain ScrollView with `.map()` instead, or use `nestedScrollEnabled` carefully.

5. **`streakShields` storage key**: The storage field is `streakShields` (NOT renamed to `streakFreezes`) to avoid breaking existing user data. UI text everywhere says "streak freeze(s)".

6. **Free tier level cap**: `getLevelInfo(xp).level` is capped at 3 for free users in the UI only. XP continues to accumulate normally. On upgrade, the real level immediately shows.

7. **Expo Go compatibility**: Some features (haptics, notifications) behave differently or fail silently in Expo Go. All notification code is wrapped in try/catch for this reason.

---

## Remaining TODO

- [ ] Real IAP / StoreKit 2 integration — replace `isPremium` boolean with App Store receipt verification (iOS) and Google Play Billing (Android)
- [ ] Potential: session templates, iCloud sync, repeat-last-session quick start, Pro trial (3-day), Apple Health mindfulness integration

---

## Git

Remote: `github.com:SyreeseOfficial/Listen.git`  
Branch: `master`  
Last commit: Add calendar heatmap, weekly goal, Deep Listen mode, session limit, streak at-risk notification, better complete screen, rename shields to freezes
