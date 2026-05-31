# TurtWatch — Suggested MVP Scope

Principle: ship the **daily loop + reward + recovery + delight** with the smallest
surface area. Defer anything requiring servers, payments, or social.

## MVP (P0) — "The Daily Loop"
**In**
- Onboarding (mascot, theme, reminder time, starter Turtbux).
- Home with streak ring + today CTA + balance + fact teaser.
- Daily Upload (library/sample photo, name, mood, notes, tags, optional location).
- Calendar with all 5 day states + legend.
- Daily Entry Detail (view/edit/delete).
- Missed Day Repair: leave blank, paid backfill (`repaired`), Shell Shield (`shielded`).
- Streak engine (current/longest, grace, recompute on backfill).
- Turtbux: earn (upload/streak/notes/facts/onboarding) + spend (repair/shield/cosmetics) + ledger.
- Turtbux Shop: themes, frames, stickers, mascot accessories, shields, recovery.
- Turtle Facts Library (local catalog, flip + reward).
- Profile: stats, rank, achievements (local), balance.
- Settings: reminders, mascot, theme, privacy, reset.
- Local notifications (daily reminder + streak risk).
- Mascot Turtley/Shelldon with moods; cozy pastel design system; celebration animations.
- **Local persistence** (no account required).

**Deliberately deferred**
- AI Turtle Rescue (needs server + image model) → stubbed in UI as "coming soon"
  *or* prototype-only placeholder generator.
- Cloud sync / accounts, premium subscription & payments.
- Friends, leaderboards, sharing.
- PDF export, advanced stats, challenge system depth.

## P1 — "Smarter & Synced"
- Real AI Turtle Rescue (server function + safety + rate limits).
- Accounts + cloud backup/sync.
- Challenge system + richer achievements.
- Recovery cost scaling, fact-of-the-day, daily challenges.

## P2 — "Social & Premium"
- Premium subscription (extra AI gen, exclusive themes/sticker packs, advanced stats).
- PDF/photo-book export.
- Friends, gift Turtbux, gentle leaderboards.
- Web companion.

## MVP Definition of Done
- A user can: onboard → upload daily → see streak grow → earn & spend Turtbux →
  repair/shield a missed day → read facts → view profile — all offline, with
  delightful feedback, and data that survives app restarts.
