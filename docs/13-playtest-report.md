# TurtWatch — Playtest Report (6 Personas)

Six personas playtested the prototype by tracing real user journeys through the
code. This consolidates their findings, deduplicates, triages by severity, and
records what was **fixed in this pass** vs. **backlog**.

Personas: **Mara** (Cozy Collector), **Devin** (Streak Gamer), **Theo** (Economy
min-maxer), **Priya** (Turtle Superfan), **Sam** (Accessibility/robustness),
**Lily** (Casual/lapsed user).

---

## 🔴 Critical bugs — FIXED

| # | Issue | Found by | Fix |
|---|-------|----------|-----|
| C1 | **`autoApplyShield` guard was dead code** (`const yesterday = todayKey(); void yesterday;`) — a Shell Shield was silently burned on *any* missed day up to a year old, with zero streak benefit. | All 6 | Rewrote: only protects **yesterday**, and only when a streak ran into it (day-before-yesterday is covered). Runs **at most once per day** via persisted `autoShieldCheckedOn`. Regression-tested. |
| C2 | **Delete + re-upload Turtbux farm** — `deleteEntry` kept earned Turtbux; re-uploading the same day re-awarded base + streak + bonuses indefinitely. | Theo, Devin | `deleteEntry` now reverses earned Turtbux via a `refund` ledger entry (clamped to balance to preserve `balance ≥ 0`). Net-zero per delete/re-upload cycle. Tested. |
| C3 | **Shell Shield permanently lost on delete** — deleting a shielded day left the shield `used` forever. | Devin, Theo | `deleteEntry` restores the shield to `available` when a shielded day is removed. Tested. |
| C4 | **Library photos broke on reload** — `URL.createObjectURL` blob URLs were persisted to localStorage and died on refresh, destroying the core artifact. | Sam, Priya | Photos are now downscaled + stored as base64 JPEG (`src/lib/image.ts`); survive reload and stay under quota. |

---

## 🟠 High-impact — FIXED

| # | Issue | Found by | Fix |
|---|-------|----------|-----|
| H1 | **Onboarding name discarded** — `displayName` hardcoded to "Pond Keeper"; the nickname field only set the mascot name and was never shown. | Mara, Lily | Nickname now sets both `displayName` and `mascotName`; greeting + a **mascot speech bubble** on Home show it. |
| H2 | **Fact-of-the-day never paid out** — Home chip read a broken "🪙 +" and navigated away without calling `claimFactOfDay`. | Mara | Tapping now claims +2 Turtbux (once/day), shows "🪙 +2" → "Read ✓". |
| H3 | **No lapsed-user path** — returning after a break showed a flat Home with no recovery surface; repair was only reachable by hunting the calendar. | Lily | Added a **"Welcome back" card** (sleepy mascot) with a direct "Repair a missed day" button + reassurance that longest streak is safe. |
| H4 | **Past entries couldn't be edited** — edit button only showed for today. | Priya | Entry Detail now edits any day via `/upload?date=YYYY-MM-DD` (routes through `updateEntry`, no reward re-farm). |
| H5 | **Notifications were inert** — toggles/time wrote state nothing read. | Lily, Sam | Implemented real Web Notifications (`src/lib/notifications.ts` + `useReminders`): permission requested on opt-in, daily reminder fires once/day after the set time when today isn't done; honest permission-status hints in Settings. |
| H6 | **Today looked "completed"** — empty today used the green `st-completed` class. | Sam, Priya | Neutral `st-today` class; the ring outline marks today. |
| H7 | **`rich` achievement keyed on current balance** — spending it dropped eligibility. | Theo | Now keyed on `lifetimeEarned`. |

---

## 🟡 Accessibility pass — FIXED

| # | Issue | Fix |
|---|-------|-----|
| A1 | White-on-pastel CTA contrast failed AA (1.7:1) | Primary buttons use a darkened `--primary-deep`; deepened all theme deep-tones and `--text`/`--muted` tokens. |
| A2 | No keyboard focus indicator | Global `:focus-visible` ring on buttons, chips, cards, day cells, tabs. |
| A3 | Modal lacked dialog semantics | `role="dialog"`, `aria-modal`, `aria-labelledby`, **Escape to close**. |
| A4 | Toasts not announced | `role="status" aria-live="polite"`. |
| A5 | Reduced-motion ignored Framer Motion | `<MotionConfig reducedMotion="user">` at root covers all motion components. |
| A6 | Non-focusable clickable `<div>`s (fact cards, option cards) | `Card` with `onClick` is now a keyboard button (role/tabIndex/Enter+Space); `FactCard` is a real `<button>`. |
| A7 | Toggles/mood chips had no state | `aria-pressed` added. |
| A8 | Calendar nav/cells & decorative emoji unlabeled | `aria-label` on month nav + day cells; decorative emoji/images `aria-hidden`. |

## 🟡 Robustness — FIXED
- **Persistence schema versioning** (`__v`) — incompatible old shapes are dropped instead of crashing with `undefined` fields.
- **Storage quota errors surfaced** — `saveState` emits a `turtwatch:storage-error` event; the shell shows a friendly toast instead of silently losing data.
- **Calendar completion %** — current month now divides by *elapsed* days (not the full month) and guards divide-by-zero; footer shows the real month name.
- **`updateEntry`** now re-evaluates achievements.
- **`reset()`** fully clears optional date flags (caught by a regression test).
- **Fact-of-the-day** selection uses a hash of the full date (was day-of-month with a UTC-parse bug).

---

## 🔵 Backlog (recommended next, not in this pass)

**Features (high value):**
- **Entry feed + search** (Priya) — reverse-chronological, searchable by name/tag/mood; the key missing piece for a real diary.
- **Multi-turtle profiles** (Priya) — `turtleId` on entries + a roster; filter calendar/feed per turtle.
- **Streak Hibernation / planned absence** (Devin) — pause the streak for pre-approved days.
- **"On this day" memories** (Mara) — resurface last year's entry; cheap retention win.
- **Shareable streak card** (Mara) — pastel image export of streak + cutest turtle.
- **Recovery wizard / batch repair** (Lily, Devin) — guide through a multi-day gap with running cost; today the repair flow is one day at a time.
- **Turtle name generator 🎲** and **seasonal mascot accessories** (Mara).
- **Growth tracking** (weight/length sparkline) for real keepers (Priya).

**Economy health (Theo):**
- More **recurring sinks** (the economy is source-heavy; cosmetics are one-time).
  Ideas: streak insurance, accessory upkeep, prestige/rebirth for the +2000 365-day payout.
- **Note/meta bonus 24h window** to fully close future edit-farming.
- **Ledger reconciliation assertion** (`balance === Σ deltas`) in `commit()`.
- **Sub-reason ledger lines** (log streak/milestone separately from `upload`).

**UX polish:**
- Streak-impact preview ("14 → 0") before delete (Devin).
- At-risk **countdown** instead of "naps at midnight" (Devin).
- Repair flow should collect name/notes/mood, not just a photo (Priya) — partially
  mitigated by editable past entries.
- Sticker packs are purchasable but inert — wire them up or mark "coming soon" (Mara).
- Equipped **frame** should also show on the Home thumbnail, not just Entry Detail (Mara).
- "Jump to year" on the calendar for long histories (Priya).

**A11y (remaining):**
- Associate every `<label>` with its input via `htmlFor`/`id` (a few done; sweep the rest).
- Full focus-trap inside the modal (Escape + ARIA done; trap pending).
- Verify AA across *all* state-badge/calendar text on colored backgrounds.

---

## Top cross-persona themes
1. **The shield/economy mechanics had real exploits** — all fixed; these were the
   most damaging (silent shield loss + currency farm).
2. **The lapsed-user journey was the weakest** — now has a welcome-back path and
   working reminders.
3. **Personalization felt broken** (name vanished) — now surfaced with a talking mascot.
4. **Accessibility needed a foundational pass** — contrast, focus, motion, semantics
   addressed; a few sweeps remain.
5. **Diary depth (feed/search/multi-turtle)** is the biggest *feature* opportunity.
