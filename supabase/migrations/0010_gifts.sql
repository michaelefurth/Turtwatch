-- TurtWatch — hatchling gifts between friends. The hatch/care loop stays
-- client-side; this only carries a cosmetic hatchling from one account to
-- another. The recipient claims a gift into their own collection.

create table if not exists gift (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null references app_user(id) on delete cascade,
  to_user      uuid not null references app_user(id) on delete cascade,
  hatchling_id text not null,
  created_at   timestamptz not null default now(),
  claimed      boolean not null default false
);
create index if not exists gift_to on gift (to_user, claimed);
alter table gift enable row level security;
create policy "gift_select" on gift for select using (to_user = auth.uid() or from_user = auth.uid());

create or replace function srv_send_gift(p_friend uuid, p_hatchling text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from friendship where status = 'accepted'
     and ((requester = v_user and addressee = p_friend) or (requester = p_friend and addressee = v_user))
  ) then raise exception 'NOT_FRIENDS'; end if;
  if exists (select 1 from gift where from_user = v_user and to_user = p_friend and created_at > now() - interval '5 seconds') then
    raise exception 'TOO_SOON';
  end if;
  -- don't let one sender flood a friend's mailbox
  if (select count(*) from gift where from_user = v_user and to_user = p_friend and not claimed) >= 20 then
    raise exception 'GIFT_LIMIT';
  end if;
  insert into gift (from_user, to_user, hatchling_id) values (v_user, p_friend, left(p_hatchling, 40));
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_list_gifts() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'from', u.id, 'username', u.username, 'displayName', u.display_name,
      'mascot', u.mascot, 'hatchlingId', g.hatchling_id
    ) order by g.created_at desc)
    from gift g join app_user u on u.id = g.from_user
    where g.to_user = v_user and not g.claimed
  ), '[]'::jsonb);
end $$;

create or replace function srv_claim_gift(p_id uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_h text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  update gift set claimed = true where id = p_id and to_user = v_user and not claimed returning hatchling_id into v_h;
  if v_h is null then raise exception 'NO_GIFT'; end if;
  return jsonb_build_object('hatchlingId', v_h);
end $$;

create or replace function srv_decline_gift(p_id uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from gift where id = p_id and to_user = v_user and not claimed;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function
  srv_send_gift(uuid, text), srv_list_gifts(), srv_claim_gift(uuid), srv_decline_gift(uuid)
  to authenticated;
