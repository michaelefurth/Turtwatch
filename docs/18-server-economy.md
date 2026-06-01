# TurtWatch — Server-Authoritative Cloud Economy

When the Supabase backend is configured (`VITE_TURTWATCH_BACKEND=supabase` + URL/
anon key), TurtWatch runs in **cloud mode**: login is required, data lives in the
relational tables, and **every Turtbux reward is recomputed on the server**, so a
tampered client can't mint currency. With no backend configured the app stays
fully **local** and offline — nothing changes.

## How it works
- **Login gate** (`CloudGate` + `CloudAuth`): cloud mode requires sign-in before
  the app loads. On first sign-in, any on-device data is **migrated up** once
  (`srv_import_state`, no-op if the account already has turtles).
- **Hydration** (`loadCloudState`): the local Zustand store is populated from the
  relational tables (entries, wallet, inventory, shields, collection, tasks,
  notifications, recent ledger).
- **Server-authoritative writes** (`economyReconcile`): the UI updates
  optimistically for snappiness, then the store calls the matching server RPC
  which **recomputes** the reward/validates the spend; the authoritative wallet is
  patched back. On any rejection (insufficient funds, duplicate day, bad input)
  the store **re-hydrates** from the server (rollback).
- **Server RPCs** (`supabase/migrations/0005_server_economy.sql`): `srv_upload`
  (streak + milestone + note/meta + golden, all server-side), `srv_repair`,
  `srv_ai_rescue`, `shield_day`, `purchase_shop_item`, `srv_login_bonus`,
  `srv_fact_of_day`, `srv_minigame`/`srv_mantra` (server enforces the daily cap),
  `srv_toggle_task` (step cap + leg bonus + streak), and `srv_open_booster`
  (server rolls rarity, tracks collection, rewards new vs duplicate). The booster
  rolls against `fact_card`, seeded from the same generator as the client
  (`0006_fact_cards_seed.sql`).
- Everything goes through the existing **idempotent `apply_turtbux`** so the
  `balance ≥ 0` and `balance == Σledger` invariants hold on the server.

## Deploy

**One-file option (easiest):** paste **`supabase/schema.sql`** into the Supabase
SQL editor and run it once on a fresh project. It contains everything — core
schema, server-authoritative economy, the 336-card seed, push tables, and the
`turtles` storage bucket + policies.

**Or via the CLI (incremental migrations):**
```bash
supabase db push          # applies 0001…0006 (incl. server economy + card seed)
# (regenerate the card seed if you change factCards.ts:)
node scripts/gen-fact-cards.mjs

# storage bucket + policies (docs/14), AI generator + push (docs/16/17) as needed
supabase functions deploy ai-rescue
```
Client env (Netlify): `VITE_TURTWATCH_BACKEND=supabase`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_IMAGE_STORAGE=supabase`. Auth: enable Email in
Supabase (turn off "Confirm email" for instant sign-in, or leave it on — the UI
handles the pending state).

## Verify
1. Open the deployed site → you get the **login wall**.
2. Sign up → upload a turtle → check **`turtle_entry`** + **`turtbux_ledger`**
   rows and that **`wallet.balance`** matches what the UI shows.
3. Try to cheat (e.g. edit localStorage balance) → after the next action the wallet
   snaps back to the server's value.
4. Open a booster → **`user_card`** grows and the reward matches card rarities.
5. Sign in on a second device → your pond loads from the server.

## Notes / current edges
- **Profile & notification prefs** sync to `app_user` / `notification_settings`
  (debounced). Cloud users skip the local onboarding (defaults; customise in
  Settings).
- **Tasks** use server ids; add/remove/toggle re-hydrate the trek slice.
- **Booster** reveal is authoritative server-side; the on-screen cards reflect the
  server roll after the round resolves.
- Photos are uploaded to Storage first; the DB stores the URL.
- The local JSON-snapshot backup (docs/16) is the *local-mode* sync path; cloud
  mode uses the relational tables instead.
