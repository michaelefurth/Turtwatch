# TurtWatch — Product Requirements Document (PRD)

## 1. Summary
TurtWatch is a cozy, playful **turtle-tracking calendar app**. The core habit loop:
**upload one turtle picture every day** and build a **turtle streak**. Each daily
entry can carry a photo, turtle name, notes, mood, tags, and optional location.
The app rewards consistency with an in-app currency (**Turtbux**), celebrates
milestones, sends gentle reminders, and teaches cute turtle facts.

It is **not** a serious wildlife-tracking tool. It is a personal turtle diary +
gamified habit tracker with a wholesome, pastel, sticker-book personality.

## 2. Vision & Tone
- **Cozy, pastel, rounded, cutesy, funny, wholesome.**
- Pond aesthetic: lily pads, ripples, bubbles, shells, sticker illustrations.
- Mascot **Turtley** (default; "Shelldon" selectable) guides and cheers the user.
- Failure is never punishing. A missed day is "a little pond nap," not a red X.

## 3. Goals & Non-Goals
**Goals**
- Make a daily 10-second ritual feel delightful and rewarding.
- Reward streaks and exploration without shaming lapses.
- Provide playful recovery mechanics (Repair, AI Rescue, Shell Shield).
- Be monetizable through cosmetics and convenience, never pay-to-win-your-life.

**Non-Goals**
- Scientific turtle identification / conservation data.
- Social network / public feeds (MVP is single-player). Friends are post-MVP.
- Heavy real-money gambling-style loot boxes.

## 4. Target Users / Personas
- **Cozy Collector (Mara, 24):** loves Animal Crossing, journaling apps, stickers.
  Wants a low-pressure daily ritual that feels cute.
- **Streak Gamer (Devin, 31):** motivated by streaks, currency, leaderboards-of-self.
  Will spend Turtbux to protect a streak.
- **Turtle Superfan (Priya, 38):** has real turtles/visits ponds; wants a diary
  with notes, names, and facts.

## 5. Core Features
1. **Daily turtle photo upload** — the central action.
2. **Calendar** with day states: completed, missed, repaired, AI-rescued, shielded, blank/future.
3. **Entry metadata** — turtle name, notes, mood, tags, optional location.
4. **Streak tracking** — current streak, longest streak, freeze/shield logic.
5. **Reminders** — push/local notification if no upload that day.
6. **Turtbux currency** — earned by uploading, streaks, notes, challenges, reading facts.
7. **Turtbux spending** — repair missed days, AI Turtle Rescue, Shell Shields,
   themes, stickers, frames, mascot accessories.
8. **Missed-day recovery** — blank, paid backfill, AI Rescue, or Shell Shield.
9. **Turtle Fact cards** — graphical, collectible, reward Turtbux on first read.
10. **Profile** — stats, achievements, rank, Turtbux balance.
11. **Mascot** — Turtley/Shelldon with moods + accessories.
12. **Premium (post-MVP)** — extra AI generations, themes, sticker packs,
    advanced stats, PDF export, cloud backup.

## 6. Functional Requirements (selected)
- FR-1: A user may create **at most one primary entry per calendar day** (local timezone).
- FR-2: Uploading a photo for *today* marks the day **completed** and awards Turtbux.
- FR-3: The streak increments only for consecutive completed/protected days.
- FR-4: A day in the past with no entry is **missed** and eligible for recovery.
- FR-5: Recovery options are gated by Turtbux balance and shield inventory.
- FR-6: A Shell Shield, if held, **auto-protects** the most recent missed day
  (configurable: auto or manual).
- FR-7: Reading a fact awards Turtbux **once** per fact.
- FR-8: All currency mutations are recorded in an append-only ledger.
- FR-9: Notifications fire only if the day is not yet completed and the user opted in.

## 7. Success Metrics (North Star + supporting)
- **North Star:** Daily Turtle Uploads (DTU).
- D1 / D7 / D30 retention.
- Median current streak length; % of users with streak ≥ 7.
- Turtbux sink/source ratio (economy health).
- Recovery-feature usage (Repair / Rescue / Shield) per missed day.
- Fact cards read per user; cosmetic unlock rate.

## 8. Constraints & Assumptions
- Mobile-first (portrait). Offline-friendly; daily action must work without network.
- Privacy-first: photos are personal; default storage is local/private cloud.
- AI Turtle generation runs server-side (cost + safety); rate-limited.

## 9. Release Phases
- **MVP (P0):** upload, calendar, streak, Turtbux earn/spend basics, repair,
  shield, facts, profile, local notifications, mascot, theming.
- **P1:** AI Turtle Rescue, challenges system, achievements depth, cloud sync.
- **P2:** Premium subscription, PDF export, friends/leaderboards, advanced stats.
