# TurtWatch — Edge Cases & Considerations

## Time, timezones & "today"
- **Timezone changes / travel:** compute "today" from a stored IANA tz; if the
  user crosses midnight via travel, don't retroactively break a streak. Prefer
  "a day is covered" semantics over wall-clock comparisons.
- **DST transitions:** use date keys (`YYYY-MM-DD`), never raw 24h math.
- **Clock tampering:** server timestamps are authoritative in cloud build; on
  device, detect large backward clock jumps and avoid granting duplicate rewards.
- **Just-before-midnight upload:** grace logic — yesterday-covered keeps streak
  "at risk but intact" until local midnight.

## Entries
- **One entry per day:** enforce UNIQUE(user,date); creating a second returns
  `ENTRY_EXISTS` → route to edit instead.
- **Editing/deleting affects streak:** deleting a covered day can break/shorten a
  streak → always **recompute** from full set, never increment/decrement blindly.
- **One-time bonuses on edit:** note/meta bonuses must be idempotent — track that
  they were already paid for an entry so editing doesn't farm Turtbux.
- **Future dates:** cannot create/upload for the future; calendar future days are
  inert.
- **Huge photos / unsupported formats:** validate type/size, compress, strip EXIF
  GPS unless the user opts into location.

## Turtbux economy
- **Insufficient funds:** block spend, show friendly "save up a bit more 🪙".
- **Double-spend / rapid taps:** idempotency keys + atomic debit-then-grant;
  disable buttons while pending.
- **Negative balance:** invariant `balance >= 0` enforced in DB + logic.
- **Backfill farming:** backfilled/repaired days earn **no base upload Turtbux**
  and cost Turtbux — they're a sink, not a source.
- **Refunds:** failed AI Rescue must refund the reserved Turtbux (ledger `refund`).
- **Ledger/balance drift:** balance is `sum(ledger)`; add a reconciliation check.

## Recovery mechanics
- **Shield with none in stock:** offer to buy one inline, or fall back to repair.
- **Auto-apply ambiguity:** if multiple days were missed (multi-day lapse), define
  policy: shield only protects the *single most recent* missed day; older gaps
  stay missed (recoverable manually). Communicate clearly.
- **Shield then later upload:** allow upgrade `shielded → repaired`; decide refund
  policy (default: no refund) and keep it consistent.
- **Repairing a day that re-links two runs:** recompute longest streak too.
- **AI Rescue latency/failure:** show pending state; on failure refund + retry.

## Streaks
- **Long lapses:** current streak resets to 0 but **longest is preserved**; never
  show 0 as punishment — celebrate longest + "start a new streak today".
- **Multiple shields stacking:** shields never stack on an already-covered day and
  never apply to the future.

## Notifications
- **Permission denied / revoked:** degrade gracefully; show in-app reminders.
- **Already uploaded:** suppress the daily reminder for that day.
- **Spam protection:** hard caps per day + quiet hours + per-type opt-out.
- **Stale scheduled notif after upload:** cancel/reschedule on each upload.

## Content & safety
- **AI output safety:** fixed wholesome prompt, content filter, no user free-text
  into the image prompt (prevents abuse); cute-turtle only.
- **User photos:** private by default; clear export & delete; no public exposure
  in MVP.
- **Offensive notes/tags (if sharing ships in P2):** moderation before any social.

## Data & sync
- **Offline create then sync conflict:** entries are keyed by (user,date); on
  conflict prefer the one with a photo, else newest `updated_at`; surface a merge
  note. Economy reconciles via ledger (append-only, idempotent).
- **Account deletion / GDPR:** cascade delete + export; purge Storage photos.
- **Local-only data loss (web prototype):** clearing browser storage wipes data;
  warn users; offer JSON export (and cloud backup in P1).

## UX / accessibility
- **Empty states** everywhere (no entries, no facts read, empty shop category).
- **Reduce motion:** swap confetti for a gentle fade; respect OS setting.
- **Color-blind safety:** every calendar state pairs color with an icon/glyph.
- **Very long streaks / big numbers:** format (1.2k) and cap streak bonus (+30/day).
- **First-day user:** streak = 1 after first upload; don't show "at risk" yet.
