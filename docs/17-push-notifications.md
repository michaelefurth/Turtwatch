# TurtWatch — Push Notifications (reminders & good mornings)

Two layers:

1. **In-app reminders (always on, no setup):** while a tab is open, `useReminders`
   fires a local `Notification` after your reminder time if you haven't uploaded.
2. **Web Push (works when the app is closed):** a Service Worker + the
   `send-reminders` Edge Function deliver a **good morning** and a **daily
   reminder** even when TurtWatch isn't open. Requires VAPID keys + a cron.

## Client pieces (already in the app)
- `public/sw.js` — receives `push`, shows the notification, focuses the app on click.
- `src/lib/push.ts` — `enablePush()` requests permission, registers the SW, and
  (if `VITE_VAPID_PUBLIC_KEY` is set) subscribes and stores the subscription.
- Settings → **Browser push** toggle drives it. Without a VAPID key it still
  grants permission and the in-app reminder covers the tab-open case.

## Enabling closed-app push

**1. Generate VAPID keys**
```bash
npx web-push generate-vapid-keys
# → Public Key (VITE_VAPID_PUBLIC_KEY) and Private Key (server secret)
```

**2. Client env (Netlify / `.env`)**
```
VITE_VAPID_PUBLIC_KEY=<public key>
```
(Requires the Supabase backend too, so subscriptions can be stored — see docs/16/`.env.example`.)

**3. Apply the DB migration** (adds `push_subscriptions`)
```bash
supabase db push   # includes 0004_push.sql
```

**4. Deploy the sender + secrets**
```bash
supabase secrets set \
  VAPID_PUBLIC_KEY=<public key> \
  VAPID_PRIVATE_KEY=<private key> \
  VAPID_SUBJECT=mailto:you@yourpond.com \
  CRON_SECRET=<a long random string>
supabase functions deploy send-reminders
```
The function is public (`verify_jwt = false`) but rejects any request without the
matching `x-cron-secret` header, so only your cron can trigger sends.

**5. Schedule it hourly** (Supabase scheduled triggers / pg_cron):
```sql
select cron.schedule(
  'turtwatch-reminders', '0 * * * *',
  $$ select net.http_post(
       url := 'https://<ref>.functions.supabase.co/send-reminders',
       headers := '{"x-cron-secret":"<same CRON_SECRET>"}'::jsonb
     ); $$
);
```

## How delivery decides
The function runs hourly and, per user (using their stored `timezone`):
- sends a **good morning** when the local hour is 8, and
- sends a **reminder** when the local hour matches their reminder time **and**
  there's no entry for their local "today".

Matching on the local hour keeps it to ~once each per day. Invalid/expired
subscriptions (HTTP 404/410) are pruned automatically.

## Notes
- iOS Safari supports Web Push only for **installed PWAs** (Add to Home Screen).
- Payload copy lives in the function and mirrors `docs/06-notification-copy.md`.
- No VAPID key configured → the app gracefully runs in "local reminder" mode.
