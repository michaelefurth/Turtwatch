# TurtWatch — Technical Architecture Recommendation

## 1. Recommended production stack
**Client (mobile-first):** **React Native + Expo** (TypeScript).
- One codebase for iOS/Android; Expo gives camera, image picker, local
  notifications, file system, secure store, and OTA updates out of the box.
- `expo-notifications` for daily/streak reminders (local) + push (P1).
- `expo-image-picker` / `expo-camera` for the daily photo.
- Reanimated + Moti (or Lottie) for the cozy celebratory animations.

**State & data:**
- **Zustand** for app state; **TanStack Query** for server data (P1).
- Local-first storage: **SQLite (expo-sqlite)** or WatermelonDB for entries +
  ledger; **MMKV/AsyncStorage** for settings/cache. App must fully work offline.

**Backend (P1+):**
- **Supabase** (Postgres + Auth + Storage + Edge Functions) is the fastest fit:
  Postgres matches the schema in `10-database-schema.sql`, Storage holds photos,
  Row-Level Security isolates users, Edge Functions host AI Rescue + economy
  validation. Alternative: Firebase, or a custom Node/Fastify + Postgres + S3.
- **AI Turtle Rescue:** a server function calls an image-generation model with a
  fixed "cute cartoon turtle" prompt template; rate-limited, content-safe,
  cost-capped; returns an image stored in user Storage.
- **Server-authoritative economy:** Turtbux spend/earn validated server-side in
  P1 to prevent client tampering (client is optimistic, server is source of truth).

**Payments (P2):** RevenueCat over App Store / Play billing for premium.
**Analytics:** PostHog or Amplitude (privacy-respecting, opt-out).

## 2. This repository (the prototype you're reading)
A **React + Vite + TypeScript PWA** that implements the full MVP UX and *all*
business logic (streak engine, Turtbux ledger, recovery, facts, shop) against a
**local persisted store (Zustand + localStorage)**. It is the interactive design
artifact and a faithful blueprint for the RN app — components and logic port
directly. Photos use object URLs / bundled sample turtles; AI Rescue uses a
playful placeholder generator.

Why web for the prototype: instantly runnable/shareable in a browser, no native
build toolchain, and the component + logic structure maps 1:1 to React Native.

## 3. Layered design (both targets share this)
```
UI (screens/components)  ← presentational, theme-driven
        │
Hooks / selectors        ← read state, format for view
        │
Domain logic (pure TS)   ← streak.ts, turtbux.ts, recovery.ts, ranks.ts
        │   (no I/O, fully unit-testable)
Store (Zustand)          ← actions orchestrate logic + persistence
        │
Persistence adapter      ← localStorage (web) | SQLite (RN) | Supabase (cloud)
```
The **domain logic is platform-agnostic pure functions** — the most valuable,
reusable, and testable part. Swapping the persistence adapter is the only change
needed to move web → native → cloud.

## 4. Cross-cutting concerns
- **Timezone correctness** for "today"/streaks (store IANA tz; compute locally).
- **Offline-first**: queue mutations, reconcile on reconnect (P1 sync).
- **Idempotency** for economy mutations (ledger entry IDs) to avoid double-spend.
- **Privacy**: photos default to on-device/private bucket; explicit opt-in for
  cloud + analytics; easy export & delete.
- **Theming**: design tokens (CSS variables / RN theme object) so themes are data.
- **Accessibility**: reduce-motion, dynamic type, AA contrast, icon+label states.
