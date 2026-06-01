-- TurtWatch — P1 schema, RLS, and server-authoritative economy.
-- Run with: supabase db reset  (local)  or  supabase db push  (remote).
-- Mirrors docs/04-data-model.md & docs/10-database-schema.sql, hardened for prod.

create extension if not exists "pgcrypto";

-- ============================================================ enums
create type mascot_t        as enum ('turtley','shelldon');
create type entry_state_t   as enum ('completed','repaired','ai_rescued','shielded');
create type photo_source_t  as enum ('camera','library','sample','ai');
create type mood_t          as enum ('happy','sleepy','derpy','majestic','shy','hungry');
create type ledger_reason_t as enum
  ('upload','streak_bonus','milestone','note_bonus','meta_bonus','challenge',
   'fact_read','fact_of_day','repair','ai_rescue','shield_buy','shop_purchase',
   'onboarding_gift','minigame','mantra','task','daily_login',
   'lucky_upload','lucky_game','lucky_mantra','refund','admin');
create type shield_status_t as enum ('available','used');
create type fact_category_t as enum ('biology','history','record','silly','care');
create type rarity_t        as enum ('common','rare','legendary');
create type shop_category_t as enum ('theme','sticker','frame','mascot_accessory','shield','recovery');

-- ============================================================ core tables
-- app_user.id == auth.users.id (1:1 with Supabase Auth)
create table app_user (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Pond Keeper',
  timezone     text not null default 'UTC',
  mascot       mascot_t not null default 'turtley',
  mascot_name  text,
  theme_id     text not null default 'pond_mint',
  is_premium   boolean not null default false,
  onboarded    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table wallet (
  user_id         uuid primary key references app_user(id) on delete cascade,
  balance         integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  lifetime_spent  integer not null default 0
);

create table turtbux_ledger (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_user(id) on delete cascade,
  delta           integer not null,
  reason          ledger_reason_t not null,
  ref_type        text,
  ref_id          text,
  balance_after   integer not null,
  idempotency_key text,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)        -- replay-safe money mutations
);
create index on turtbux_ledger (user_id, created_at desc);

create table turtle_entry (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references app_user(id) on delete cascade,
  entry_date     date not null,
  state          entry_state_t not null,
  photo_url      text,
  photo_source   photo_source_t,
  turtle_name    text,
  mood           mood_t,
  notes          text,
  tags           text[] not null default '{}',
  location_lat   double precision,
  location_lng   double precision,
  location_label text,
  earned_turtbux integer not null default 0,
  bonus_note     boolean not null default false,
  bonus_meta     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, entry_date)             -- at most one entry per day
);
create index on turtle_entry (user_id, entry_date);

create table streak (
  user_id             uuid primary key references app_user(id) on delete cascade,
  current             integer not null default 0,
  longest             integer not null default 0,
  last_covered_date   date
);

create table shell_shield (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_user(id) on delete cascade,
  status       shield_status_t not null default 'available',
  acquired_at  timestamptz not null default now(),
  used_on_date date
);

-- ============================================================ content catalogs (global)
create table turtle_fact (
  id text primary key,
  title text not null,
  body text not null,
  category fact_category_t not null,
  emoji text not null,
  rarity rarity_t not null default 'common',
  reward integer not null default 5
);

create table user_fact_read (
  user_id uuid references app_user(id) on delete cascade,
  fact_id text references turtle_fact(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, fact_id)
);

create table shop_item (
  id text primary key,
  category shop_category_t not null,
  name text not null,
  description text not null,
  price integer not null check (price >= 0),
  emoji text not null,
  consumable boolean not null default false,
  premium_only boolean not null default false,
  theme jsonb
);

create table user_inventory (
  user_id     uuid references app_user(id) on delete cascade,
  item_id     text references shop_item(id) on delete cascade,
  equipped    boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table achievement (
  id text primary key,
  title text not null,
  description text not null,
  emoji text not null
);

create table user_achievement (
  user_id        uuid references app_user(id) on delete cascade,
  achievement_id text references achievement(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table notification_settings (
  user_id                uuid primary key references app_user(id) on delete cascade,
  daily_reminder_enabled boolean not null default true,
  reminder_time          text not null default '19:00',
  streak_risk_enabled    boolean not null default true,
  fact_of_day_enabled    boolean not null default false
);

-- ============================================================ triggers
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_entry_updated
  before update on turtle_entry
  for each row execute function set_updated_at();

-- Provision a full profile when a new auth user signs up.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into app_user (id, display_name) values (new.id, 'Pond Keeper')
    on conflict (id) do nothing;
  insert into wallet (user_id) values (new.id) on conflict do nothing;
  insert into streak (user_id) values (new.id) on conflict do nothing;
  insert into notification_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Recompute streak (current/longest/last_covered) from the full entry set.
-- A day is "covered" by the existence of any entry. See docs/05.
create or replace function recompute_streak(p_user uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_today date := current_date;
  v_cur   integer := 0;
  v_long  integer := 0;
  v_run   integer := 0;
  v_prev  date;
  v_cursor date;
  v_last  date;
  r record;
begin
  -- longest run
  for r in select entry_date from turtle_entry where user_id = p_user order by entry_date loop
    if v_prev is not null and r.entry_date = v_prev + 1 then v_run := v_run + 1;
    else v_run := 1; end if;
    if v_run > v_long then v_long := v_run; end if;
    v_prev := r.entry_date;
    v_last := r.entry_date;
  end loop;

  -- current run (with one-day grace: count from today, else yesterday)
  if exists (select 1 from turtle_entry where user_id = p_user and entry_date = v_today) then
    v_cursor := v_today;
  elsif exists (select 1 from turtle_entry where user_id = p_user and entry_date = v_today - 1) then
    v_cursor := v_today - 1;
  else
    v_cursor := null;
  end if;

  while v_cursor is not null
        and exists (select 1 from turtle_entry where user_id = p_user and entry_date = v_cursor) loop
    v_cur := v_cur + 1;
    v_cursor := v_cursor - 1;
  end loop;

  v_long := greatest(v_long, v_cur);

  update streak set current = v_cur, longest = greatest(longest, v_long), last_covered_date = v_last
   where user_id = p_user;
end $$;

create or replace function trg_recompute_streak() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  perform recompute_streak(coalesce(new.user_id, old.user_id));
  return null;
end $$;

create trigger trg_entry_streak
  after insert or update or delete on turtle_entry
  for each row execute function trg_recompute_streak();

-- ============================================================ economy RPC (atomic + idempotent)
-- Apply a balance delta and write the ledger row in one transaction.
-- Negative deltas are rejected if they would drive balance below zero.
create or replace function apply_turtbux(
  p_delta integer, p_reason ledger_reason_t,
  p_ref_type text default null, p_ref_id text default null,
  p_idempotency text default null
) returns integer
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_existing integer;
  v_balance integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;

  if p_idempotency is not null then
    select balance_after into v_existing from turtbux_ledger
     where user_id = v_user and idempotency_key = p_idempotency;
    if found then return v_existing; end if;  -- replay: return prior result
  end if;

  update wallet set
    balance = balance + p_delta,
    lifetime_earned = lifetime_earned + greatest(p_delta, 0),
    lifetime_spent  = lifetime_spent  + greatest(-p_delta, 0)
   where user_id = v_user
   returning balance into v_balance;

  if v_balance is null then raise exception 'NO_WALLET'; end if;
  if v_balance < 0 then raise exception 'INSUFFICIENT_FUNDS'; end if;

  insert into turtbux_ledger (user_id, delta, reason, ref_type, ref_id, balance_after, idempotency_key)
  values (v_user, p_delta, p_reason, p_ref_type, p_ref_id, v_balance, p_idempotency);

  return v_balance;
end $$;

-- Atomic shop purchase: debit then grant inventory (or buy a shield).
create or replace function purchase_shop_item(p_item_id text, p_idempotency text)
  returns integer
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_item shop_item;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_item from shop_item where id = p_item_id;
  if not found then raise exception 'UNKNOWN_ITEM'; end if;

  if v_item.category = 'shield' then
    perform apply_turtbux(-v_item.price, 'shield_buy', 'shield', p_item_id, p_idempotency);
    insert into shell_shield (user_id) values (v_user);
  else
    if exists (select 1 from user_inventory where user_id = v_user and item_id = p_item_id) then
      raise exception 'ALREADY_OWNED';
    end if;
    perform apply_turtbux(-v_item.price, 'shop_purchase', 'shopItem', p_item_id, p_idempotency);
    insert into user_inventory (user_id, item_id) values (v_user, p_item_id);
  end if;
  return (select balance from wallet where user_id = v_user);
end $$;

-- First read of a fact awards Turtbux exactly once.
create or replace function read_fact(p_fact_id text) returns integer
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_reward integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from user_fact_read where user_id = v_user and fact_id = p_fact_id) then
    return 0;
  end if;
  select reward into v_reward from turtle_fact where id = p_fact_id;
  if not found then raise exception 'UNKNOWN_FACT'; end if;
  insert into user_fact_read (user_id, fact_id) values (v_user, p_fact_id);
  perform apply_turtbux(v_reward, 'fact_read', 'fact', p_fact_id, 'fact_read:' || p_fact_id);
  return v_reward;
end $$;

-- Consume an available shield to protect a missed day.
create or replace function shield_day(p_date date) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_shield uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from turtle_entry where user_id = v_user and entry_date = p_date) then
    raise exception 'ENTRY_EXISTS'; end if;
  select id into v_shield from shell_shield
   where user_id = v_user and status = 'available' order by acquired_at limit 1 for update;
  if not found then raise exception 'NO_SHIELD_AVAILABLE'; end if;
  update shell_shield set status = 'used', used_on_date = p_date where id = v_shield;
  insert into turtle_entry (user_id, entry_date, state, tags)
  values (v_user, p_date, 'shielded', array['shielded']);
end $$;

-- ============================================================ RLS
alter table app_user             enable row level security;
alter table wallet               enable row level security;
alter table turtbux_ledger       enable row level security;
alter table turtle_entry         enable row level security;
alter table streak               enable row level security;
alter table shell_shield         enable row level security;
alter table user_fact_read       enable row level security;
alter table user_inventory       enable row level security;
alter table user_achievement     enable row level security;
alter table notification_settings enable row level security;

-- owner-only access for all per-user tables
do $$
declare t text;
begin
  foreach t in array array[
    'app_user','wallet','turtbux_ledger','turtle_entry','streak','shell_shield',
    'user_fact_read','user_inventory','user_achievement','notification_settings'
  ] loop
    execute format($f$
      create policy "own_select" on %1$I for select using (%2$s = auth.uid());
      create policy "own_insert" on %1$I for insert with check (%2$s = auth.uid());
      create policy "own_update" on %1$I for update using (%2$s = auth.uid()) with check (%2$s = auth.uid());
      create policy "own_delete" on %1$I for delete using (%2$s = auth.uid());
    $f$, t, case when t = 'app_user' then 'id' else 'user_id' end);
  end loop;
end $$;

-- catalogs are world-readable, never client-writable
alter table turtle_fact enable row level security;
alter table shop_item   enable row level security;
alter table achievement enable row level security;
create policy "facts_read"   on turtle_fact for select using (true);
create policy "shop_read"    on shop_item   for select using (true);
create policy "achv_read"    on achievement for select using (true);
