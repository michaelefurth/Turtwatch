-- TurtWatch — server-tracked hatchlings, so the collection (and care/companion)
-- syncs across devices and gifts are authoritative. Care is gated server-side
-- (an egg costs 100 care); the client supplies the rolled hatchling id (the
-- catalog is cosmetic + client-side, so there's no exploit). EGG_COST = 100.

alter table app_user add column if not exists hatch_care integer not null default 0;
alter table app_user add column if not exists hatch_total integer not null default 0;
alter table app_user add column if not exists hatch_companion text;

create table if not exists user_hatchling (
  user_id      uuid not null references app_user(id) on delete cascade,
  hatchling_id text not null,
  copies       integer not null default 1,
  primary key (user_id, hatchling_id)
);
alter table user_hatchling enable row level security;
create policy "own_hatchling_select" on user_hatchling for select using (user_id = auth.uid());
-- all writes go through the SECURITY DEFINER functions below (incl. gift RPCs)

-- one-time seed from a device's local collection (fills, never overwrites)
create or replace function srv_sync_hatch(p_care integer, p_total integer, p_companion text, p_rows jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); rec record;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  for rec in select * from jsonb_each_text(coalesce(p_rows, '{}'::jsonb)) loop
    insert into user_hatchling (user_id, hatchling_id, copies)
    values (v_user, rec.key, greatest(1, (rec.value)::int))
    on conflict (user_id, hatchling_id) do nothing;
  end loop;
  update app_user set
    hatch_care = greatest(hatch_care, greatest(coalesce(p_care, 0), 0)),
    hatch_total = greatest(hatch_total, greatest(coalesce(p_total, 0), 0)),
    hatch_companion = coalesce(hatch_companion, p_companion)
  where id = v_user;
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_add_care(p_n integer) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_care int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  update app_user set hatch_care = least(greatest(hatch_care + greatest(coalesce(p_n, 0), 0), 0), 500)
    where id = v_user returning hatch_care into v_care;
  return jsonb_build_object('care', v_care);
end $$;

-- spend an egg to hatch the client-rolled hatchling (server gates the care cost)
create or replace function srv_hatch(p_id text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_care int; v_new boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select hatch_care into v_care from app_user where id = v_user for update;
  if coalesce(v_care, 0) < 100 then raise exception 'NO_EGG'; end if;
  select not exists (select 1 from user_hatchling where user_id = v_user and hatchling_id = p_id) into v_new;
  insert into user_hatchling (user_id, hatchling_id, copies) values (v_user, left(p_id, 40), 1)
    on conflict (user_id, hatchling_id) do update set copies = user_hatchling.copies + 1;
  update app_user set hatch_care = hatch_care - 100, hatch_total = hatch_total + 1 where id = v_user;
  return jsonb_build_object('id', p_id, 'isNew', v_new, 'care', v_care - 100);
end $$;

-- release a duplicate back to the pond for care (client passes the rarity care,
-- clamped so a tampered client can't mint a huge amount — it's cosmetic anyway)
create or replace function srv_release_hatchling(p_id text, p_care integer) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_copies int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select copies into v_copies from user_hatchling where user_id = v_user and hatchling_id = p_id;
  if coalesce(v_copies, 0) < 2 then raise exception 'NO_SPARE'; end if;
  update user_hatchling set copies = copies - 1 where user_id = v_user and hatchling_id = p_id;
  update app_user set hatch_care = least(hatch_care + greatest(least(coalesce(p_care, 0), 100), 0), 500) where id = v_user;
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_set_companion(p_id text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  update app_user set hatch_companion = nullif(p_id, '') where id = v_user;
  return jsonb_build_object('ok', true);
end $$;

-- gifting is now collection-aware: the sender must own a spare; it's moved atomically.
create or replace function srv_send_gift(p_friend uuid, p_hatchling text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_copies int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from friendship where status = 'accepted'
     and ((requester = v_user and addressee = p_friend) or (requester = p_friend and addressee = v_user))
  ) then raise exception 'NOT_FRIENDS'; end if;
  if exists (select 1 from gift where from_user = v_user and to_user = p_friend and created_at > now() - interval '5 seconds') then
    raise exception 'TOO_SOON';
  end if;
  if (select count(*) from gift where from_user = v_user and to_user = p_friend and not claimed) >= 20 then
    raise exception 'GIFT_LIMIT';
  end if;
  select copies into v_copies from user_hatchling where user_id = v_user and hatchling_id = p_hatchling;
  if coalesce(v_copies, 0) < 2 then raise exception 'NO_SPARE'; end if;
  update user_hatchling set copies = copies - 1 where user_id = v_user and hatchling_id = p_hatchling;
  insert into gift (from_user, to_user, hatchling_id) values (v_user, p_friend, left(p_hatchling, 40));
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_claim_gift(p_id uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_h text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  update gift set claimed = true where id = p_id and to_user = v_user and not claimed returning hatchling_id into v_h;
  if v_h is null then raise exception 'NO_GIFT'; end if;
  insert into user_hatchling (user_id, hatchling_id, copies) values (v_user, v_h, 1)
    on conflict (user_id, hatchling_id) do update set copies = user_hatchling.copies + 1;
  return jsonb_build_object('hatchlingId', v_h);
end $$;

grant execute on function
  srv_sync_hatch(integer, integer, text, jsonb), srv_add_care(integer),
  srv_hatch(text), srv_release_hatchling(text, integer), srv_set_companion(text)
  to authenticated;
