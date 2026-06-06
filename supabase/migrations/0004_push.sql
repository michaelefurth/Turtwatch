-- Web Push subscriptions for reminders & good mornings.

create table if not exists push_subscriptions (
  endpoint     text primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  subscription jsonb not null,
  last_sent    jsonb not null default '{}'::jsonb, -- { morning:'YYYY-MM-DD', reminder:'YYYY-MM-DD' } dedup
  updated_at   timestamptz not null default now()
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
create policy "own_push_select" on push_subscriptions for select using (user_id = auth.uid());
create policy "own_push_insert" on push_subscriptions for insert with check (user_id = auth.uid());
create policy "own_push_update" on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_push_delete" on push_subscriptions for delete using (user_id = auth.uid());
-- The send-reminders Edge Function reads these with the service role (bypasses RLS).
