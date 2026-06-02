-- TurtWatch — FULL server-authoritative economy.
-- Every Turtbux mutation is recomputed and validated server-side here, so a
-- tampered client can never mint currency. Constants mirror src/logic/*.
-- All functions are SECURITY DEFINER and key off auth.uid().

-- ---------- per-user economy state (daily caps, journey, login flags) ----------
alter table app_user add column if not exists login_bonus_on date;
alter table app_user add column if not exists fact_of_day_on date;
alter table app_user add column if not exists last_booster_on date;
alter table app_user add column if not exists game_date date;
alter table app_user add column if not exists game_earned integer not null default 0;
alter table app_user add column if not exists mantra_date date;
alter table app_user add column if not exists mantra_earned integer not null default 0;
alter table app_user add column if not exists trek_steps integer not null default 0;
alter table app_user add column if not exists trek_streak integer not null default 0;
alter table app_user add column if not exists trek_longest integer not null default 0;
alter table app_user add column if not exists trek_last_date date;
alter table app_user add column if not exists task_date date;
alter table app_user add column if not exists task_earned integer not null default 0;
alter table app_user add column if not exists task_steps_today integer not null default 0;
-- lifetime side-game counters (drive Profile stats + flip/mantra achievements)
alter table app_user add column if not exists game_won integer not null default 0;
alter table app_user add column if not exists mantra_focused integer not null default 0;

create table if not exists task_item (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user(id) on delete cascade,
  title       text not null,
  done        boolean not null default false,
  last_done   date,
  created_at  timestamptz not null default now()
);
create index if not exists task_item_user on task_item (user_id);
alter table task_item enable row level security;
create policy "own_task_all" on task_item for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- card catalog (seeded by 0006). rarity is TEXT to avoid extending the rarity_t
-- enum (which lacks 'epic') inside a transaction.
create table if not exists fact_card (
  id     text primary key,
  text   text not null,
  rarity text not null,
  emoji  text not null
);
alter table fact_card enable row level security;
create policy "cards_read" on fact_card for select using (true);

create table if not exists user_card (
  user_id uuid references app_user(id) on delete cascade,
  card_id text references fact_card(id) on delete cascade,
  copies  integer not null default 1,
  primary key (user_id, card_id)
);
alter table user_card enable row level security;
-- read-only to clients; collection grows only via SECURITY DEFINER functions
create policy "own_card_select" on user_card for select using (user_id = auth.uid());

-- ---------- helpers ----------
create or replace function milestone_bonus(p_streak integer) returns integer language sql immutable as $$
  select case p_streak when 7 then 25 when 30 then 100 when 100 then 300 when 180 then 500 when 365 then 750 else 0 end;
$$;

-- ---------- uploads ----------
-- old signature replaced: p_source added (camera/library/sample), so drop first
-- to avoid an ambiguous overload.
drop function if exists srv_upload(date, text, text, mood_t, text, text[], text);
create or replace function srv_upload(
  p_date date, p_photo text, p_name text, p_mood mood_t,
  p_notes text, p_tags text[], p_loc text, p_source photo_source_t default 'library'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_streak int; v_reward int; v_note bool; v_meta bool; v_golden int := 0; v_balance int; v_entry uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from turtle_entry where user_id = v_user and entry_date = p_date) then raise exception 'ENTRY_EXISTS'; end if;
  v_note := coalesce(length(btrim(p_notes)), 0) >= 10;
  v_meta := p_mood is not null and coalesce(array_length(p_tags, 1), 0) > 0;

  -- the AFTER INSERT trigger recomputes the streak; then read it for the reward
  insert into turtle_entry (user_id, entry_date, state, photo_url, photo_source, turtle_name, mood, notes, tags, location_label, bonus_note, bonus_meta)
  values (v_user, p_date, 'completed', p_photo, coalesce(p_source, 'library'), p_name, p_mood, p_notes, coalesce(p_tags, '{}'), p_loc, v_note, v_meta)
  returning id into v_entry;

  select current into v_streak from streak where user_id = v_user;

  v_reward := 10 + least(v_streak, 30) + milestone_bonus(v_streak)
              + (case when v_note then 3 else 0 end) + (case when v_meta then 2 else 0 end);
  if random() < 0.08 then v_golden := 15; v_reward := v_reward + 15; end if;

  update turtle_entry set earned_turtbux = v_reward where id = v_entry;
  -- no idempotency key: the UNIQUE(user_id,entry_date) guard already prevents
  -- double-credit, and a fresh re-upload after a delete must credit again
  v_balance := apply_turtbux(v_reward, 'upload', 'entry', p_date::text);
  return jsonb_build_object('balance', v_balance, 'earned', v_reward, 'streak', v_streak, 'golden', v_golden);
end $$;

-- ---------- recovery ----------
create or replace function srv_repair(p_date date, p_photo text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from turtle_entry where user_id = v_user and entry_date = p_date) then raise exception 'ENTRY_EXISTS'; end if;
  v_balance := apply_turtbux(-30, 'repair', 'entry', p_date::text, 'repair:' || p_date::text);
  insert into turtle_entry (user_id, entry_date, state, photo_url, photo_source, tags)
  values (v_user, p_date, 'repaired', p_photo, 'library', array['backfilled']);
  return jsonb_build_object('balance', v_balance);
end $$;

create or replace function srv_ai_rescue(p_date date, p_photo text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from turtle_entry where user_id = v_user and entry_date = p_date) then raise exception 'ENTRY_EXISTS'; end if;
  v_balance := apply_turtbux(-60, 'ai_rescue', 'entry', p_date::text, 'ai_rescue:' || p_date::text);
  insert into turtle_entry (user_id, entry_date, state, photo_url, photo_source, turtle_name, tags)
  values (v_user, p_date, 'ai_rescued', p_photo, 'ai', 'Mystery AI Turtle', array['ai-rescued']);
  return jsonb_build_object('balance', v_balance);
end $$;

-- ---------- daily bonuses ----------
create or replace function srv_login_bonus(p_date date) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_streak int; v_tier int := 0; v_total int; v_balance int; v_today date; v_rows int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  -- derive "today" server-side from the user's timezone; ignore client date (anti future-claim)
  v_today := (now() at time zone coalesce((select timezone from app_user where id = v_user), 'UTC'))::date;
  -- atomic check-and-set: only one caller can flip the date
  update app_user set login_bonus_on = v_today where id = v_user and login_bonus_on is distinct from v_today;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('awarded', 0); end if;
  select current into v_streak from streak where user_id = v_user;
  v_tier := case
    when v_streak >= 365 then 75 when v_streak >= 180 then 50 when v_streak >= 100 then 30
    when v_streak >= 60 then 25 when v_streak >= 30 then 25 when v_streak >= 14 then 10 when v_streak >= 7 then 10 else 0 end;
  v_total := 5 + v_tier;
  v_balance := apply_turtbux(v_total, 'daily_login', null, null, 'login:' || v_today::text);
  return jsonb_build_object('awarded', v_total, 'balance', v_balance);
end $$;

create or replace function srv_fact_of_day(p_date date) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_balance int; v_today date; v_rows int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_today := (now() at time zone coalesce((select timezone from app_user where id = v_user), 'UTC'))::date;
  update app_user set fact_of_day_on = v_today where id = v_user and fact_of_day_on is distinct from v_today;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('awarded', 0); end if;
  v_balance := apply_turtbux(5, 'fact_of_day', null, null, 'fod:' || v_today::text);
  return jsonb_build_object('awarded', 5, 'balance', v_balance);
end $$;

-- ---------- capped side-games (server enforces the daily cap & amount) ----------
create or replace function srv_minigame(p_date date, p_amount integer) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_earned int; v_award int; v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  -- lock the row so concurrent calls can't both see an empty daily total
  select case when game_date = p_date then game_earned else 0 end into v_earned from app_user where id = v_user for update;
  v_award := greatest(0, least(coalesce(p_amount, 0), 20 - v_earned)); -- cap 20/day; ignore inflated client amounts
  if v_award > 0 then v_balance := apply_turtbux(v_award, 'minigame', 'flipgame', null, null); end if;
  update app_user set game_date = p_date, game_earned = v_earned + v_award, game_won = game_won + 1 where id = v_user;
  return jsonb_build_object('awarded', v_award, 'balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
end $$;

create or replace function srv_mantra(p_date date, p_amount integer) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_earned int; v_award int; v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select case when mantra_date = p_date then mantra_earned else 0 end into v_earned from app_user where id = v_user for update;
  v_award := greatest(0, least(coalesce(p_amount, 0), 20 - v_earned));
  if v_award > 0 then v_balance := apply_turtbux(v_award, 'mantra', 'mantra', null, null); end if;
  update app_user set mantra_date = p_date, mantra_earned = v_earned + v_award, mantra_focused = mantra_focused + 1 where id = v_user;
  return jsonb_build_object('awarded', v_award, 'balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
end $$;

-- ---------- trek tasks ----------
create or replace function srv_toggle_task(p_id uuid, p_date date) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_task task_item; v_steps int; v_taskEarned int; v_pay int := 0; v_leg int := 0;
  v_oldSteps int; v_newSteps int; v_arrived bool := false; v_streak int; v_last date; v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_task from task_item where id = p_id and user_id = v_user;
  if not found then raise exception 'NO_TASK'; end if;

  if v_task.done then
    update task_item set done = false where id = p_id;
    return jsonb_build_object('rewarded', 0, 'stepped', false);
  end if;

  -- first payout for this task today?
  if v_task.last_done is distinct from p_date then
    select trek_steps, trek_last_date, trek_streak,
           case when task_date = p_date then task_earned else 0 end,
           case when task_date = p_date then task_steps_today else 0 end
      into v_oldSteps, v_last, v_streak, v_taskEarned, v_steps
      from app_user where id = v_user;

    if v_steps >= 12 then  -- daily step cap (anti-farm)
      update task_item set done = true, last_done = p_date where id = p_id;
      return jsonb_build_object('rewarded', 0, 'stepped', false);
    end if;

    v_newSteps := v_oldSteps + 1;
    v_arrived := floor(v_newSteps / 8.0) > floor(v_oldSteps / 8.0);
    v_pay := greatest(0, least(4, 24 - v_taskEarned));
    if v_arrived then v_leg := 20; end if;

    -- streak (per day)
    if v_last is distinct from p_date then
      v_streak := case when v_last = p_date - 1 then v_streak + 1 else 1 end;
    end if;

    update task_item set done = true, last_done = p_date where id = p_id;
    update app_user set
      trek_steps = v_newSteps,
      trek_last_date = p_date,
      trek_streak = v_streak,
      trek_longest = greatest(trek_longest, v_streak),
      task_date = p_date,
      task_earned = v_taskEarned + v_pay,
      task_steps_today = v_steps + 1
      where id = v_user;

    if (v_pay + v_leg) > 0 then v_balance := apply_turtbux(v_pay + v_leg, 'task', 'quest', null, null); end if;
    return jsonb_build_object('rewarded', v_pay + v_leg, 'stepped', true, 'arrived', v_arrived, 'steps', v_newSteps,
                              'streak', v_streak, 'balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
  end if;

  update task_item set done = true where id = p_id;
  return jsonb_build_object('rewarded', 0, 'stepped', false);
end $$;

-- ---------- booster packs ----------
-- p_idempotency makes a paid open network-retry-safe (a timed-out retry won't
-- double-charge). p_date is kept for signature compatibility.
drop function if exists srv_open_booster(boolean, date);
create or replace function srv_open_booster(p_paid boolean, p_date date, p_idempotency text default null) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_balance int; v_results jsonb := '[]'::jsonb; v_total int := 0;
  v_roll numeric; v_rarity text; v_card record; v_isNew bool; v_reward int; v_today date; v_rows int; i int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_today := (now() at time zone coalesce((select timezone from app_user where id = v_user), 'UTC'))::date;
  if p_paid then
    v_balance := apply_turtbux(-60, 'booster_open', 'booster', null, coalesce(p_idempotency, 'booster:' || gen_random_uuid()::text));
  else
    -- atomic free-once-per-day: only one concurrent caller flips the date
    update app_user set last_booster_on = v_today where id = v_user and last_booster_on is distinct from v_today;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then raise exception 'NO_FREE_BOOSTER'; end if;
  end if;

  for i in 1..3 loop
    v_roll := random() * 100;
    v_rarity := case when v_roll < 60 then 'common' when v_roll < 85 then 'rare' when v_roll < 97 then 'epic' else 'legendary' end;
    select * into v_card from fact_card where rarity = v_rarity order by random() limit 1;
    if not found then select * into v_card from fact_card order by random() limit 1; end if;

    -- explicit new-vs-dupe pre-check (robust vs the xmax internal detail)
    select not exists (select 1 from user_card where user_id = v_user and card_id = v_card.id) into v_isNew;
    insert into user_card (user_id, card_id, copies) values (v_user, v_card.id, 1)
      on conflict (user_id, card_id) do update set copies = user_card.copies + 1;

    -- new cards pay full rarity value; duplicates pay a smaller rarity-scaled amount
    v_reward := case when v_isNew
      then (case v_card.rarity when 'common' then 3 when 'rare' then 8 when 'epic' then 16 else 35 end)
      else (case v_card.rarity when 'common' then 1 when 'rare' then 2 when 'epic' then 5 else 10 end) end;
    v_total := v_total + v_reward;
    v_results := v_results || jsonb_build_object('id', v_card.id, 'isNew', v_isNew);
  end loop;

  if v_total > 0 then v_balance := apply_turtbux(v_total, 'booster_reward', 'booster', null, null); end if;
  return jsonb_build_object('cards', v_results, 'rewarded', v_total,
                            'balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
end $$;

-- ---------- one-time migrate-local-up (first sign-in) ----------
-- Imports an on-device AppState JSON, but only if the account has no entries yet.
create or replace function srv_import_state(p_state jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); rec record; v_bal int; v_shields int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from turtle_entry where user_id = v_user) then return jsonb_build_object('skipped', true); end if;

  for rec in select * from jsonb_each(p_state->'entries') loop
    insert into turtle_entry (user_id, entry_date, state, photo_url, photo_source, turtle_name, mood, notes, tags, location_label, earned_turtbux, bonus_note, bonus_meta)
    values (
      v_user, (rec.key)::date, (rec.value->>'state')::entry_state_t,
      rec.value->>'photoUrl', nullif(rec.value->>'photoSource','')::photo_source_t,
      rec.value->>'turtleName', nullif(rec.value->>'mood','')::mood_t, rec.value->>'notes',
      coalesce((select array_agg(x) from jsonb_array_elements_text(rec.value->'tags') x), '{}'),
      rec.value->'location'->>'label', coalesce((rec.value->>'earnedTurtbux')::int, 0),
      coalesce((rec.value->'bonuses'->>'note')::boolean, false), coalesce((rec.value->'bonuses'->>'meta')::boolean, false)
    ) on conflict (user_id, entry_date) do nothing;
  end loop;
  perform recompute_streak(v_user);

  -- import the on-device balance, but hard-cap it so a tampered first-login JSON
  -- can't mint an arbitrary amount
  v_bal := least(greatest(coalesce((p_state->'wallet'->>'balance')::int, 0), 0), 5000);
  if v_bal > 0 then perform apply_turtbux(v_bal, 'admin', 'import', null, 'import:' || v_user::text); end if;

  for rec in select * from jsonb_each(p_state->'inventory') loop
    insert into user_inventory (user_id, item_id, equipped)
    values (v_user, rec.key, coalesce((rec.value->>'equipped')::boolean, false)) on conflict do nothing;
  end loop;

  for rec in select * from jsonb_each(coalesce(p_state->'collection', '{}'::jsonb)) loop
    insert into user_card (user_id, card_id, copies)
    values (v_user, rec.key, greatest(1, (rec.value)::int))
    on conflict (user_id, card_id) do nothing;
  end loop;

  v_shields := coalesce(jsonb_array_length(p_state->'shields'), 0);
  for i in 1..v_shields loop
    if (p_state->'shields'->(i-1)->>'status') = 'available' then
      insert into shell_shield (user_id) values (v_user);
    end if;
  end loop;

  -- bring across daily-goal tasks so the trek isn't empty after first sign-in
  for rec in select * from jsonb_array_elements(coalesce(p_state->'quest'->'tasks', '[]'::jsonb)) loop
    insert into task_item (user_id, title, done, last_done)
    values (v_user, rec.value->>'title', coalesce((rec.value->>'done')::boolean, false),
            nullif(rec.value->>'lastDoneDate','')::date);
  end loop;

  update app_user set
    trek_steps = coalesce((p_state->'quest'->>'steps')::int, 0),
    trek_streak = coalesce((p_state->'quest'->>'streakCurrent')::int, 0),
    trek_longest = coalesce((p_state->'quest'->>'streakLongest')::int, 0),
    game_won = coalesce((p_state->>'gamesWon')::int, 0),
    mantra_focused = coalesce((p_state->>'mantrasFocused')::int, 0)
  where id = v_user;

  return jsonb_build_object('imported', true);
end $$;

-- ---------- entry edit / delete (server-authoritative) ----------
-- Delete an entry, reverse its Turtbux (clamped to keep balance >= 0), restore a
-- shield that was spent on it, and recompute the streak.
create or replace function srv_delete_entry(p_date date) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_entry turtle_entry; v_reverse int; v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_entry from turtle_entry where user_id = v_user and entry_date = p_date;
  if not found then return jsonb_build_object('skipped', true, 'balance', (select balance from wallet where user_id = v_user)); end if;

  if v_entry.state = 'shielded' then
    update shell_shield set status = 'available', used_on_date = null
      where id = (select id from shell_shield where user_id = v_user and status = 'used' and used_on_date = p_date limit 1);
  end if;

  delete from turtle_entry where id = v_entry.id;
  perform recompute_streak(v_user);

  v_reverse := least(coalesce(v_entry.earned_turtbux, 0), (select balance from wallet where user_id = v_user));
  if v_reverse > 0 then v_balance := apply_turtbux(-v_reverse, 'refund', 'entry', p_date::text, null); end if;
  return jsonb_build_object('balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
end $$;

-- Edit an entry's fields; award the one-time note/meta bonus if newly satisfied.
create or replace function srv_update_entry(
  p_date date, p_name text, p_mood mood_t, p_notes text, p_tags text[], p_loc text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_entry turtle_entry; v_note bool; v_meta bool; v_delta int := 0; v_balance int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_entry from turtle_entry where user_id = v_user and entry_date = p_date;
  if not found then raise exception 'NO_ENTRY'; end if;
  v_note := coalesce(length(btrim(p_notes)), 0) >= 10;
  v_meta := p_mood is not null and coalesce(array_length(p_tags, 1), 0) > 0;
  if v_note and not v_entry.bonus_note then v_delta := v_delta + 3; end if;
  if v_meta and not v_entry.bonus_meta then v_delta := v_delta + 2; end if;

  update turtle_entry set
    turtle_name = p_name, mood = p_mood, notes = p_notes,
    tags = coalesce(p_tags, '{}'), location_label = p_loc,
    bonus_note = (v_note or bonus_note), bonus_meta = (v_meta or bonus_meta),
    earned_turtbux = earned_turtbux + v_delta, updated_at = now()
    where id = v_entry.id;

  if v_delta > 0 then v_balance := apply_turtbux(v_delta, 'note_bonus', 'entry', p_date::text, null); end if;
  return jsonb_build_object('rewarded', v_delta, 'balance', coalesce(v_balance, (select balance from wallet where user_id = v_user)));
end $$;

-- ---------- privilege lockdown ----------
-- The raw ledger primitive must NOT be client-callable, or anyone could mint
-- Turtbux via /rpc/apply_turtbux. Only the SECURITY DEFINER srv_* wrappers
-- (which run as the owner) may call it.
revoke execute on function apply_turtbux(integer, ledger_reason_t, text, text, text) from public, authenticated, anon;
revoke execute on function recompute_streak(uuid) from public, authenticated, anon;

-- Clients call only the validated, server-authoritative surface.
grant execute on function
  srv_upload(date, text, text, mood_t, text, text[], text, photo_source_t),
  srv_repair(date, text), srv_ai_rescue(date, text),
  srv_delete_entry(date), srv_update_entry(date, text, mood_t, text, text[], text),
  srv_login_bonus(date), srv_fact_of_day(date),
  srv_minigame(date, integer), srv_mantra(date, integer),
  srv_toggle_task(uuid, date), srv_open_booster(boolean, date, text),
  srv_import_state(jsonb),
  read_fact(text), purchase_shop_item(text, text), shield_day(date)
  to authenticated;
