# TurtWatch — Multi-User QA Pass (new features)

Four QA agents tested the new features (Turtle Flip, Mantras, Accounts/Cloud,
expanded Shop) plus a full end-to-end regression. Verdict: every screen/route is
wired and working. The concrete bugs they found are fixed below.

## 🎴 Turtle Flip & 🧘 Mantras
- **Mantra reward swallowed when pausing at 0s** — completion now keyed off a
  `doneRef`, not the `running` state, so the last-second pause still pays out.
- **StrictMode double-award** (dev) in both screens — guarded by refs
  (`awardedRef` / `doneRef`); reward fires exactly once per board/focus.
- **Countdown ring overflowed** when changing duration mid-run — `pct` clamped to
  ≤1 and the timer now restarts at the new length.
- **Board reshuffled mid-game** if photos changed in another tab — deck now
  rebuilds only on a new round.
- **Reduced-motion** now also disables the ring's CSS sweep.

## 🛍️ Shop & economy
- **`priceOverride` floor** — `Math.max(1, …)` so no caller (deal/console/test)
  can buy free or credit the wallet.
- **Daily-deal "% off" is now computed** from the real discount, not a fixed label.
- **Stickers are now visible** — equipping a sticker pack overlays its emoji on
  turtle photos (Home, Diary feed, Entry detail) via the new `TurtlePhoto`.

## ☁️ Accounts / cloud / storage
- **Failed auto-backups now retry** — the content signature advances only after a
  successful backup (was advancing before, losing failed attempts).
- **No device bleed-through** — `cloud` metadata is stripped from the snapshot;
  restore keeps this device's preferences; sign-out/restore reset them.
- **Sign-up pending confirmation** is handled ("check your email") instead of a
  false "Account created!".
- **Content signature covers metadata edits** (notes/mood/tags), so edits sync.
- **Restore validates the snapshot shape** and warns the count of local turtles
  that will be replaced.
- **Storage delete policy** added + best-effort photo cleanup on entry delete.

## 🔁 Regression fixes
- **"Turtbux Tycoon"** description now matches its condition (earn 500 total).
- **New achievements**: Flip Friend / Flip Master / Deep Breath / Pond Zen, with
  **Games won** & **Mantras focused** added to the Profile stats.
- **`/upload?date=<past>` with no entry** now redirects to repair/calendar instead
  of silently saving to today.
- **`saveTodayEntry` never overwrites** — re-saving today routes through
  `updateEntry` (no double base reward).
- **A11y**: `ConfirmModal` now traps focus + autofocuses; TabBar has an
  `aria-label` and `aria-hidden` icons.
- **Type hygiene**: deprecated `JSX.Element` → `ReactElement`.

Tests: **36 passing** (added game/mantra reward + save-guard regressions).

## Known backlog (not blocking)
- Cloud restore is full-replace (no per-entry merge); a future merge/conflict UI.
- Public photo bucket (obscure-by-UUID) — switch to signed URLs if privacy needs grow.
- Repair flow could accept a custom uploaded photo (currently sample turtles).
- `supabaseRepository` remains an alternative reference layer alongside the JSONB
  snapshot approach.
