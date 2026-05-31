# 🐢 TurtWatch

A cozy, playful **turtle-tracking calendar & habit app**. Upload one turtle photo
every day, build a turtle streak, earn **Turtbux**, and decorate your pond. It's a
personal turtle diary + gamified habit tracker — pastel, rounded, and wholesome.

> Not a serious wildlife tracker. It is a cute turtle diary with a mascot named
> **Turtley** (or **Shelldon**), Shell Shields, AI Turtle Rescue, and collectible
> turtle facts.

## What's in this repo

### 📐 Design (`/docs`)
The full product + design package:
1. [Product Requirements](docs/01-product-requirements.md)
2. [User Flows](docs/02-user-flows.md)
3. [Screen-by-Screen UX](docs/03-screen-ux.md)
4. [Data Model](docs/04-data-model.md)
5. [Streak & Turtbux Logic](docs/05-streak-and-turtbux-logic.md)
6. [Notification Copy](docs/06-notification-copy.md)
7. [Suggested MVP Scope](docs/07-mvp-scope.md)
8. [Technical Architecture](docs/08-technical-architecture.md)
9. [Component Structure](docs/09-component-structure.md)
10. [Example DB Schema (SQL)](docs/10-database-schema.sql)
11. [API Routes / Backend Functions](docs/11-api-routes.md)
12. [Edge Cases & Considerations](docs/12-edge-cases.md)
13. [Playtest Report (6 personas)](docs/13-playtest-report.md)

### 💻 Working prototype (`/src`)
A **React + Vite + TypeScript PWA** implementing the full MVP UX and *all*
business logic against a local persisted store. Every screen is live:

- **Onboarding** — mascot, theme, reminder time, +50 Turtbux welcome gift
- **Home** — streak ring, today's upload CTA / done card, fact-of-the-day, mascot moods
- **Daily Upload** — photo (file or sample), name, mood, notes, tags, location, live Turtbux estimate
- **Calendar** — month grid with completed / missed / repaired / AI-rescued / shielded states
- **Daily Entry Detail** — view / edit / delete, framed photo
- **Missed Day Repair** — leave blank · paid backfill · AI Turtle Rescue · Shell Shield
- **Turtbux Shop** — shields, themes, frames, stickers, mascot accessories (buy + equip)
- **Turtle Facts Library** — flippable collectible cards that reward Turtbux
- **Profile** — stats, rank, achievements, balance
- **Settings** — reminders, mascot, theme, data export, reset

The **domain logic is pure, platform-agnostic TypeScript** (`src/logic`) and is
unit-tested — it ports directly to the recommended React Native production app.

> The web prototype is the interactive design artifact. The production target is
> **React Native + Expo** with a **Supabase** backend — see
> [docs/08](docs/08-technical-architecture.md). Swapping the persistence adapter
> (`src/store/persistence.ts`) is the only change needed to move web → native → cloud.

### ☁️ Cloud backend — Supabase (P1, `/supabase`)
The P1 backend is scaffolded and real:
- **Migrations** (`supabase/migrations`): full schema, RLS (owner-only rows,
  world-readable catalogs), and a **server-authoritative economy** — atomic +
  idempotent `apply_turtbux`, `purchase_shop_item`, `read_fact`, `shield_day`;
  streaks recomputed by trigger so backfilling re-links runs.
- **Edge Function** (`supabase/functions/ai-rescue`): reserves Turtbux → generates
  a wholesome turtle (fixed prompt, no user text) → stores it → creates the entry →
  refunds on failure.
- **Client glue**: `src/lib/supabase.ts`, `src/data/repository.ts` (port interface),
  `src/data/supabaseRepository.ts` (cloud impl).

The app stays **local-first by default**; set `VITE_TURTWATCH_BACKEND=supabase`
(+ URL/anon key) to use the cloud. Setup steps: [`supabase/README.md`](supabase/README.md).

### 🧪 Playtested & hardened
Six personas playtested the build; their critical findings are fixed (shield/economy
exploits, lapsed-user flow, photo persistence, a working reminder system, and an
accessibility pass). Full write-up + backlog: [docs/13](docs/13-playtest-report.md).

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # run the streak / Turtbux / rank unit tests
pnpm build      # type-check + production build
```

## Architecture at a glance

```
UI (screens / components)  → presentational, theme-driven
Store (Zustand)            → actions orchestrate logic + persistence (src/store)
Domain logic (pure TS)     → streak, turtbux, recovery, ranks (src/logic) — unit-tested
Persistence adapter        → localStorage today; SQLite / Supabase later
```

Cosmetic themes are pure data (CSS custom properties), the Turtbux economy is an
append-only ledger (`balance === sum(deltas)`), and streaks are always recomputed
from the full entry set so backfilling re-links runs correctly.

Made with 💚 and far too many turtle puns.
