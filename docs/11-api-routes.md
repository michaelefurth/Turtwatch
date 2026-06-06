# TurtWatch — API Routes / Backend Functions (P1 cloud build)

REST-ish design; all authenticated (Bearer / Supabase session). The MVP prototype
implements these as **local store actions** (see `src/store/useStore.ts`) — same
shapes, no network. Economy endpoints are **server-authoritative**.

## Auth & User
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`
- `GET  /me` → user + wallet + streak + settings
- `PATCH /me` → update displayName, mascot, mascotName, themeId, timezone

## Entries
- `GET  /entries?from=YYYY-MM-DD&to=YYYY-MM-DD` → entries in range (for calendar)
- `GET  /entries/:date` → single day (404-ish ⇒ blank/missed)
- `POST /entries` → create today's entry
  ```json
  { "date":"2026-05-31","photoUploadId":"...","turtleName":"Sir Reggie",
    "mood":"majestic","notes":"chonky","tags":["pond","sunbathing"],
    "location":{"lat":1.2,"lng":3.4,"label":"Backyard"} }
  ```
  → server marks `completed`, computes Turtbux, updates streak, returns
  `{ entry, walletDelta, newStreak, awards:[...] }`
- `PATCH /entries/:id` → edit metadata (re-evaluates note/meta bonuses, once)
- `DELETE /entries/:id` → delete (recomputes streak; may reverse one-time bonuses)
- `POST /uploads` → presigned URL / direct upload for the photo (Storage)

## Recovery (missed days)
- `POST /entries/:date/repair` → debit repair cost, create `repaired` entry from
  an uploaded photo. `{ photoUploadId }` → `{ entry, walletDelta, newStreak }`
- `POST /entries/:date/ai-rescue` → debit cost, enqueue/await AI generation,
  create `ai_rescued` entry. `{}` → `{ entry, walletDelta, jobId }`
- `POST /entries/:date/shield` → consume an available Shell Shield (or 402 if none),
  create `shielded` entry. → `{ entry, shieldRemaining, newStreak }`

## Turtbux economy (server-authoritative, idempotent)
- `GET  /wallet` → `{ balance, lifetimeEarned, lifetimeSpent }`
- `GET  /wallet/ledger?limit=50` → recent ledger entries
- `POST /wallet/earn`  `{ reason, refType, refId, idempotencyKey }` → validated award
- `POST /wallet/spend` `{ reason, amount, refType, refId, idempotencyKey }`
  → 200 `{ balanceAfter }` or 402 `INSUFFICIENT_FUNDS`
- All money mutations require an `idempotencyKey`; replays return the first result.

## Shop & Inventory
- `GET  /shop/items?category=` → catalog
- `POST /shop/purchase` `{ itemId, idempotencyKey }` → atomic spend + grant
  inventory (shields/recovery are consumable) → `{ item, walletDelta }`
- `GET  /inventory` → owned items
- `POST /inventory/:itemId/equip` → equip theme/frame/accessory (unequips peers)

## Facts
- `GET  /facts` → catalog with `read` flag for this user
- `POST /facts/:id/read` → mark read; first read awards Turtbux (idempotent)

## Gamification
- `GET  /achievements` → definitions + earned status
- `GET  /challenges` , `POST /challenges/:id/claim`
- `GET  /profile/stats` → aggregated stats + rank

## Notifications (P1)
- `PUT  /notifications/settings` → reminder toggles + time
- `POST /notifications/register-device` → push token (FCM/APNs)
- Server cron evaluates "no upload by reminder time" / "streak at risk" and
  sends push using copy from `docs/06-notification-copy.md`.
  (MVP uses on-device local notifications instead.)

## AI Turtle Rescue function (Edge/Lambda)

> **As implemented (local-first build):** the `ai-rescue` Edge Function is
> **generator-only** — authz (signed-in) → call the image model with a fixed
> "cute pastel cartoon turtle" prompt → return `{ image: data-URL }`. It does NOT
> touch Turtbux, entries, or storage. The **client** (`src/lib/aiTurtle.ts` +
> `useStore.aiRescueDay`) performs the Turtbux debit and creates the `ai_rescued`
> entry locally, falling back to a procedural turtle if the function is
> unavailable. This keeps the image-model key server-side while the economy stays
> client-authoritative for the offline-first app. (`501` when no provider key.)

- **Fully server-authoritative variant (planned for the relational cloud build):**
  authz → reserve Turtbux (idempotent) → generate → safety filter → store image →
  create `ai_rescued` entry → finalize ledger; refund on failure. The
  `POST /entries/:date/ai-rescue` route above describes this future mode (not yet
  wired in the local-first app).

## Error conventions
- `402 INSUFFICIENT_FUNDS`, `409 ENTRY_EXISTS` (day already has an entry),
  `409 NO_SHIELD_AVAILABLE`, `422 VALIDATION`, `429 RATE_LIMITED`.
