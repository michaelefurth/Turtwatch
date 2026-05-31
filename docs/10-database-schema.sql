-- TurtWatch — Example Database Schema (PostgreSQL / Supabase-flavored)
-- Mirrors docs/04-data-model.md. Enable RLS so each user sees only their rows.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type mascot_t        as enum ('turtley','shelldon');
create type entry_state_t   as enum ('completed','repaired','ai_rescued','shielded');
create type photo_source_t  as enum ('camera','library','sample','ai');
create type mood_t          as enum ('happy','sleepy','derpy','majestic','shy','hungry');
create type ledger_reason_t as enum
  ('upload','streak_bonus','milestone','note_bonus','meta_bonus','challenge',
   'fact_read','fact_of_day','repair','ai_rescue','shield_buy','shop_purchase',
   'onboarding_gift','refund','admin');
create type shield_status_t as enum ('available','used');
create type fact_category_t as enum ('biology','history','record','silly','care');
create type rarity_t        as enum ('common','rare','legendary');
create type shop_category_t as enum ('theme','sticker','frame','mascot_accessory','shield','recovery');

-- ---------- core ----------
create table app_user (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null default 'Pond Keeper',
  email         text unique,
  timezone      text not null default 'UTC',
  mascot        mascot_t not null default 'turtley',
  mascot_name   text,
  theme_id      text not null default 'pond_mint',
  is_premium    boolean not null default false,
  created_at    timestamptz not null default now()
);

create table wallet (
  user_id         uuid primary key references app_user(id) on delete cascade,
  balance         integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  lifetime_spent  integer not null default 0
);

create table turtbux_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references app_user(id) on delete cascade,
  delta         integer not null,
  reason        ledger_reason_t not null,
  ref_type      text,
  ref_id        text,
  balance_after integer not null,
  created_at    timestamptz not null default now()
);
create index on turtbux_ledger (user_id, created_at desc);

create table turtle_entry (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_user(id) on delete cascade,
  entry_date      date not null,
  state           entry_state_t not null,
  photo_url       text,
  photo_source    photo_source_t,
  turtle_name     text,
  mood            mood_t,
  notes           text,
  tags            text[] not null default '{}',
  location_lat    double precision,
  location_lng    double precision,
  location_label  text,
  earned_turtbux  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, entry_date)            -- at most one entry per day
);
create index on turtle_entry (user_id, entry_date);

create table streak (
  user_id             uuid primary key references app_user(id) on delete cascade,
  current             integer not null default 0,
  longest             integer not null default 0,
  last_completed_date date
);

create table shell_shield (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references app_user(id) on delete cascade,
  status       shield_status_t not null default 'available',
  acquired_at  timestamptz not null default now(),
  used_on_date date
);

-- ---------- content catalogs (global, read-only to users) ----------
create table turtle_fact (
  id          text primary key,
  title       text not null,
  body        text not null,
  category    fact_category_t not null,
  graphic_key text not null,
  rarity      rarity_t not null default 'common',
  reward      integer not null default 5
);

create table user_fact_read (
  user_id uuid references app_user(id) on delete cascade,
  fact_id text references turtle_fact(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, fact_id)
);

create table shop_item (
  id           text primary key,
  category     shop_category_t not null,
  name         text not null,
  price        integer not null check (price >= 0),
  preview_key  text not null,
  consumable   boolean not null default false,
  premium_only boolean not null default false
);

create table user_inventory (
  user_id     uuid references app_user(id) on delete cascade,
  item_id     text references shop_item(id) on delete cascade,
  equipped    boolean not null default false,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ---------- gamification ----------
create table achievement (
  id          text primary key,
  title       text not null,
  description text not null,
  icon_key    text not null,
  criteria    jsonb not null
);

create table user_achievement (
  user_id        uuid references app_user(id) on delete cascade,
  achievement_id text references achievement(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table challenge (
  id         text primary key,
  title      text not null,
  goal_type  text not null,
  goal_count integer not null,
  reward     integer not null,
  starts_at  timestamptz,
  ends_at    timestamptz
);

create table user_challenge_progress (
  user_id      uuid references app_user(id) on delete cascade,
  challenge_id text references challenge(id) on delete cascade,
  progress     integer not null default 0,
  completed_at timestamptz,
  primary key (user_id, challenge_id)
);

create table notification_settings (
  user_id                uuid primary key references app_user(id) on delete cascade,
  daily_reminder_enabled boolean not null default true,
  reminder_time          text not null default '19:00',
  streak_risk_enabled    boolean not null default true,
  fact_of_day_enabled    boolean not null default false
);

-- ---------- example RLS (Supabase) ----------
-- alter table turtle_entry enable row level security;
-- create policy "own rows" on turtle_entry
--   using (user_id = auth.uid()) with check (user_id = auth.uid());
-- (repeat for wallet, turtbux_ledger, streak, shell_shield, user_* tables)
