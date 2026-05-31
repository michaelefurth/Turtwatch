# TurtWatch — User Flows

Notation: `→` step, `[?]` decision, `(reward)` Turtbux/animation moment.

## Flow A — First Run / Onboarding
1. Splash (Turtley waves) → Welcome carousel (3 cards: "Upload a turtle a day",
   "Build a streak", "Earn Turtbux").
2. Choose mascot [Turtley | Shelldon] → name it (optional).
3. Pick a pastel theme (Pond Mint default).
4. Ask notification permission ("Want Turtley to remind you?") [Allow | Later].
5. Set daily reminder time (default 7:00 PM).
6. → Land on **Home** with a "Upload your first turtle!" call to action and a
   starter gift of 50 Turtbux (reward animation).

## Flow B — Daily Upload (happy path)
1. Home → tap big **"Upload today's turtle"** button.
2. Daily Upload screen → pick from camera/library (MVP: library/sample).
3. Add turtle name (optional), mood (emoji picker), notes, tags, location (optional).
4. Tap **Save** → confetti + bubbles, Turtley cheers, streak +1.
5. (reward) Turtbux awarded: base + streak bonus + note bonus.
6. → Return to Home showing updated streak & balance.

## Flow C — Missed Day Recovery
1. User opens Calendar → taps a **missed** (past, empty) day.
2. Daily Entry Detail (empty) → "This day is napping 😴" with recovery options.
3. [?] Choose:
   - **Leave blank** → back to calendar (no change).
   - **Backfill upload (pay Turtbux)** → upload flow → day becomes **repaired**.
   - **AI Turtle Rescue (pay Turtbux)** → generate AI turtle → day becomes **ai-rescued**.
   - **Use Shell Shield** (if in inventory or buy one) → day becomes **shielded**;
     streak preserved as if completed.
4. Confirm cost modal (shows balance before/after) → apply → (reward/animation).

## Flow D — Earning & Spending Turtbux
- **Earn:** upload, streak milestones, add notes, complete challenges, read facts.
- **Spend:** open **Turtbux Shop** → categories (Recovery, Themes, Stickers,
  Frames, Mascot, Shields) → select item → confirm purchase modal → owned/equipped.

## Flow E — Reading Turtle Facts
1. Facts Library → grid of fact cards (locked/unlocked, read/unread).
2. Tap a card → flip animation reveals fact + cute graphic.
3. First read → (reward) +Turtbux, card marked "read", added to collection.

## Flow F — Streak at Risk (notification → save)
1. Evening: no upload yet → local notification fires ("Turtley misses you 🐢").
2. Tap notification → deep link to Daily Upload.
3. Upload before local midnight → streak preserved.
4. If midnight passes: Shell Shield auto-applies (if enabled & in stock), else day
   becomes missed and is offered for recovery next open.

## Flow G — Settings / Account
- Toggle reminders & time, choose mascot/theme, manage premium, export data (P1),
  backup/restore (P1), privacy controls, reset economy (dev/test).
