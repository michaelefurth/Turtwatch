-- TurtWatch — per-user cloud snapshot for account-based backup/sync.
-- The app serializes its whole state into one JSONB row (photos are offloaded to
-- Storage and referenced by URL). Owner-only via RLS.

create table if not exists user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table user_state enable row level security;

create policy "own_state_select" on user_state for select using (user_id = auth.uid());
create policy "own_state_insert" on user_state for insert with check (user_id = auth.uid());
create policy "own_state_update" on user_state for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own_state_delete" on user_state for delete using (user_id = auth.uid());
