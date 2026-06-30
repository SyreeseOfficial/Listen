# Listen — Product Requirements Document

## Concept

An Android app for audiophiles and music lovers to take intentional listening breaks — away from social media, notifications, and the noise of daily life. The goal is a focused, mindful session using the good audio equipment users already own.

**Target audience:** People who feel overstimulated, burned out, or just want a deliberate break to enjoy music the way it used to feel.

---

## MVP Features

### Session
- Start session button with a scroll-wheel duration picker (1-minute increments)
- Before the session starts, the app prompts the user with distraction-blocking suggestions:
  - Enable Do Not Disturb (app can do this for you with permission)
  - Enable airplane mode
  - Mute notifications
  - Move to a quiet place
  - All optional — user chooses what applies to them
- Countdown timer during session
- Session complete screen: a warm "you did it" moment + stats for that session (duration, time of day, running streak)

### History & Stats
- Session history (list of all past sessions)
- Stats dashboard:
  - Total Disconnect Time
  - Sessions Completed
  - This Week's Listening
  - Current Streak
  - Average Session Length

**Streak definition:** Any completed timed session counts. One session per calendar day continues the streak. No minimum duration.

### Design
- Light theme default, dark mode, system theme toggle
- Premium, minimal, clean aesthetic — warm and human, not techy or futuristic
- Smooth animations (tasteful, not showy)
- Fast and responsive

---

## Onboarding (4–5 screens)

1. **Welcome** — what the app is, why it exists, the vibe
2. **Theme** — Light / Dark / System
3. **Name** — enter a custom name OR roll a random one (audio/music/disconnect themed dice roll)
4. **Equipment** *(optional, skippable)* — add gear by category: headphones, IEMs, DAC, amp, speaker, etc. Free-text entry per item. Users who don't know what that stuff means can skip entirely.
5. **TBD screen** — placeholder for a future onboarding beat (goals, mood, a motivational moment, etc.)

---

## Phase 2 (Post-Launch)

- Equipment selection before/after session
- Session rating (stars or mood emoji)
- Music / album tracking
- Streak-based listening goals
- Session notes
- Equipment comparison between users (longer-term)

---

## Design Direction

- **Aesthetic:** Warm, premium, analog-feeling. Think high-end audio catalog meets modern iOS app. Not dark and robotic.
- **Imagery:** Placeholder art for now — disconnecting, listening, peace. Revisit once real art direction is locked.
- **Feel:** The kind of app that makes you want to open it. Calm, deliberate, slightly indulgent.

---

## Monetization

- Free to download
- Paid tier TBD after launch (Phase 2/3 features are the likely unlock gate)

---

## Session Interruption Behavior

- **App backgrounded** (user switches apps, changes song, etc.) → timer keeps running
- **App fully closed** mid-session → timer pauses
- **On relaunch** after a closed mid-session → prompt: "Continue your session?" with remaining time shown, or cancel it
