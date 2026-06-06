# TurtWatch — Supabase backend (P1)

This is the cloud backend that turns the offline-first prototype into a
synced, multi-device app. The web app stays **local-first by default**; setting
`VITE_TURTWATCH_BACKEND=supabase` (+ URL/anon key) flips it to the cloud.

## What's here
- `migrations/0001_init.sql` — schema, triggers, RLS, and **server-authoritative
  economy** (atomic + idempotent `apply_turtbux`, `purchase_shop_item`,
  `read_fact`, `shield_day`; streak recomputed by trigger).
- `migrations/0002_seed_catalog.sql` — global facts / shop items / achievements.
- `functions/ai-rescue/` — Edge Function for AI Turtle Rescue (reserve Turtbux →
  generate image with a fixed wholesome prompt → store → create entry → refund on
  failure).
- `config.toml` — local stack config.

Client glue lives in the app at `src/lib/supabase.ts`,
`src/data/repository.ts`, and `src/data/supabaseRepository.ts`.

## Local setup
```bash
# 1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
supabase start                 # boots Postgres, Auth, Storage, Studio
supabase db reset              # applies migrations + seed

# 2. Create the photo storage bucket (once):
#    (Studio → Storage → New bucket "turtles", public)  OR run the SQL below.

# 3. Point the app at it (.env):
#    VITE_TURTWATCH_BACKEND=supabase
#    VITE_SUPABASE_URL=http://localhost:54321
#    VITE_SUPABASE_ANON_KEY=<anon key printed by `supabase start`>
pnpm dev
```

### Storage bucket + policies (run in SQL editor)
```sql
insert into storage.buckets (id, name, public) values ('turtles','turtles', true)
  on conflict (id) do nothing;

-- users may write only into their own folder: turtles/<uid>/...
create policy "own turtle uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'turtles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own turtle updates" on storage.objects for update to authenticated
  using (bucket_id = 'turtles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own turtle deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'turtles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public turtle reads" on storage.objects for select using (bucket_id = 'turtles');
```

## Deploy (remote project)
```bash
supabase link --project-ref <ref>
supabase db push
supabase functions deploy ai-rescue
supabase secrets set OPENAI_API_KEY=sk-...     # or your image provider
```

## Security model
- **RLS everywhere**: every per-user table is owner-only (`user_id = auth.uid()`).
  Catalogs (facts/shop/achievements) are world-readable, never client-writable.
- **Economy is server-authoritative**: clients cannot mint Turtbux. All balance
  changes go through `apply_turtbux` (SECURITY DEFINER), which enforces
  `balance >= 0` and is **idempotent** via `(user_id, idempotency_key)`.
- **Streaks are recomputed by a trigger** from the full entry set on every
  insert/update/delete — backfilling re-links runs correctly.
- **AI Rescue** never passes user free-text to the image model (fixed prompt) and
  refunds the reserved Turtbux on generation failure.

## Type generation (optional)
```bash
supabase gen types typescript --local > src/data/database.ts
```
(The committed `database.ts` is a lean hand-written subset to keep the client typed.)
