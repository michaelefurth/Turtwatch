# TurtWatch — Streak & Turtbux Logic

All "day" math uses the user's **local timezone**. A day is "covered" if an entry
exists with state in {`completed`,`repaired`,`ai_rescued`,`shielded`}.

## 1. Streak Rules
- **Current streak** = length of the consecutive run of covered days ending at the
  most recent covered day, *provided that run reaches today or yesterday*.
  - If today is covered → streak counts through today.
  - If today is NOT covered but yesterday is → streak is "at risk" but intact
    (grace until local midnight).
  - If neither today nor yesterday is covered → current streak = 0 (broken).
- **Longest streak** = max run ever observed (monotonic; never decreases).
- **Repaired / AI-rescued / shielded days count** toward streaks the same as
  completed days. This is intentional: recovery mechanics are the product.
- Backfilling a past gap **re-links** adjacent runs and can retroactively grow the
  current streak (and longest). Always recompute from the full entry set.

### Reference algorithm
```
days = set of covered dates
cursor = today
if today not in days and yesterday not in days: current = 0
else:
  if today not in days: cursor = yesterday   # grace
  current = 0
  while cursor in days: current++; cursor = cursor - 1 day
longest = max over all maximal consecutive runs in `days`
```

## 2. Shell Shield Behaviour
- A shield converts a single missed day into a `shielded` day (no photo required),
  preserving continuity.
- **Auto-apply (default ON):** at the first app open after a day was missed, if the
  user holds ≥1 available shield, automatically shield the most recent missed day
  and notify ("Shell Shield saved your streak! 🛡️"). Manual mode asks first.
- Shields never apply to future days and never stack on an already-covered day.
- A shielded day can later be upgraded by uploading a real photo (state →
  `repaired`); the consumed shield is **not** refunded (kept simple), but this is
  configurable.

## 3. Turtbux — Earning (sources)
| Action | Reward |
|---|---|
| Daily upload (on-time, today) | **10** base |
| Streak bonus | `min(streak, 30) × 1` added to the upload (caps at +30/day) |
| Milestone bonus | streak hits 7 → +25, 30 → +100, 100 → +500, 365 → +2000 |
| Add notes (≥ 10 chars) to an entry | +3 (once per entry) |
| Add a mood + ≥1 tag | +2 (once per entry) |
| Read a fact (first time) | +5 common / +10 rare / +25 legendary |
| Complete a challenge (P1) | per challenge (e.g. +50) |
| Onboarding gift | +50 one-time |
| Daily fact-of-the-day open | +2 (once/day) |

> **Anti-farm:** per-entry bonuses are one-time; daily caps prevent backfilling
> 100 days for 100× upload rewards — **backfilled days earn no base upload
> Turtbux** (you *spend* to repair them; see sinks).

## 4. Turtbux — Spending (sinks)
| Item | Cost (tunable) |
|---|---|
| Repair (backfill upload) a missed day | **30** |
| AI Turtle Rescue a missed day | **60** |
| Shell Shield (buy 1) | **80** |
| Theme | 150–300 |
| Sticker pack | 100 |
| Frame | 120 |
| Mascot accessory | 90–250 |

**Recovery cost scaling (optional):** cost can scale with how old the gap is, e.g.
`repairCost = 30 + 5 × min(daysAgo, 6)` to keep recent fixes cheap and discourage
mass backfilling. Prototype uses flat costs for clarity.

## 5. Economy Invariants
- Every balance change writes a `TurtbuxLedgerEntry`; `balance == sum(deltas)`.
- A purchase is **atomic**: check balance → debit ledger → grant item; on any
  failure, roll back (no item without debit, no debit without item).
- Never allow balance < 0. Reject spend if `balance < cost`.
- `lifetimeEarned`/`lifetimeSpent` are derived from positive/negative deltas.

## 6. Ranks (derived from lifetimeEarned or total turtles)
Hatchling → Sprout → Pondling → Shellback → Wave Rider → Pond Sage → Ancient One.
(Thresholds tunable; see `src/logic/ranks.ts`.)
