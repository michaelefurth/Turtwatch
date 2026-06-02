-- TurtWatch — Friends / social layer.
-- Friends connect by a public @handle, see each other's streak + goal progress,
-- and can share turtles. All cross-user reads go through SECURITY DEFINER RPCs
-- that verify an accepted friendship, so table RLS stays owner-only.

-- public handle for discovery; per-entry share flag
alter table app_user add column if not exists username text;
create unique index if not exists app_user_username_key on app_user (lower(username));
alter table turtle_entry add column if not exists shared boolean not null default false;

create table if not exists friendship (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references app_user(id) on delete cascade,
  addressee  uuid not null references app_user(id) on delete cascade,
  status     text not null default 'pending',   -- pending | accepted
  created_at timestamptz not null default now(),
  unique (requester, addressee)
);
create index if not exists friendship_requester on friendship (requester);
create index if not exists friendship_addressee on friendship (addressee);
alter table friendship enable row level security;
-- readable to the two parties; all writes happen via the SECURITY DEFINER RPCs.
create policy "own_friendship_select" on friendship for select
  using (requester = auth.uid() or addressee = auth.uid());

-- ---------- handle ----------
create or replace function srv_set_username(p_username text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_name text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_name := lower(btrim(p_username));
  if v_name !~ '^[a-z0-9_]{3,20}$' then raise exception 'BAD_USERNAME'; end if;
  if exists (select 1 from app_user where lower(username) = v_name and id <> v_user) then raise exception 'USERNAME_TAKEN'; end if;
  update app_user set username = v_name where id = v_user;
  return jsonb_build_object('username', v_name);
end $$;

-- ---------- requests ----------
create or replace function srv_send_friend_request(p_handle text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_target uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select id into v_target from app_user where lower(username) = lower(btrim(p_handle));
  if v_target is null then raise exception 'NO_SUCH_USER'; end if;
  if v_target = v_user then raise exception 'CANNOT_FRIEND_SELF'; end if;
  if exists (
    select 1 from friendship
     where (requester = v_user and addressee = v_target)
        or (requester = v_target and addressee = v_user)
  ) then raise exception 'ALREADY_REQUESTED'; end if;
  insert into friendship (requester, addressee, status) values (v_user, v_target, 'pending');
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_respond_friend_request(p_id uuid, p_accept boolean) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_found boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  -- only the addressee of a pending request may respond
  if p_accept then
    update friendship set status = 'accepted' where id = p_id and addressee = v_user and status = 'pending';
  else
    delete from friendship where id = p_id and addressee = v_user and status = 'pending';
  end if;
  get diagnostics v_found = row_count;
  if not v_found then raise exception 'NO_REQUEST'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_remove_friend(p_friend uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from friendship
   where (requester = v_user and addressee = p_friend)
      or (requester = p_friend and addressee = v_user);
  -- also tear down any shared goals the two were in together (no orphan goals)
  delete from group_goal g
   where exists (select 1 from group_goal_member m where m.goal_id = g.id and m.user_id = v_user)
     and exists (select 1 from group_goal_member m where m.goal_id = g.id and m.user_id = p_friend);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- reads (verify friendship; expose only public fields) ----------
create or replace function srv_list_friends() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', u.id, 'username', u.username, 'displayName', u.display_name, 'mascot', u.mascot,
      'streak', coalesce(s.current, 0), 'trekStreak', coalesce(u.trek_streak, 0),
      'sharedCount', coalesce(sc.cnt, 0), 'lastShared', ls.j
    ) order by coalesce(s.current, 0) desc), '[]'::jsonb)
    from (
      select case when requester = v_user then addressee else requester end as fid
      from friendship where status = 'accepted' and (requester = v_user or addressee = v_user)
    ) f
    join app_user u on u.id = f.fid
    left join streak s on s.user_id = f.fid
    left join lateral (select count(*) cnt from turtle_entry where user_id = f.fid and shared) sc on true
    left join lateral (
      select jsonb_build_object('date', entry_date, 'photoUrl', photo_url, 'turtleName', turtle_name) j
      from turtle_entry where user_id = f.fid and shared order by entry_date desc limit 1
    ) ls on true
  );
end $$;

create or replace function srv_pending_requests() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  return jsonb_build_object(
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('id', fr.id, 'from', u.id, 'username', u.username, 'displayName', u.display_name, 'mascot', u.mascot))
      from friendship fr join app_user u on u.id = fr.requester
      where fr.addressee = v_user and fr.status = 'pending'
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('id', fr.id, 'to', u.id, 'username', u.username, 'displayName', u.display_name))
      from friendship fr join app_user u on u.id = fr.addressee
      where fr.requester = v_user and fr.status = 'pending'
    ), '[]'::jsonb)
  );
end $$;

create or replace function srv_friend_turtles(p_friend uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from friendship where status = 'accepted'
     and ((requester = v_user and addressee = p_friend) or (requester = p_friend and addressee = v_user))
  ) then raise exception 'NOT_FRIENDS'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', entry_date, 'photoUrl', photo_url, 'turtleName', turtle_name, 'mood', mood, 'state', state
    ) order by entry_date desc), '[]'::jsonb)
    from turtle_entry where user_id = p_friend and shared
  );
end $$;

grant execute on function
  srv_set_username(text), srv_send_friend_request(text),
  srv_respond_friend_request(uuid, boolean), srv_remove_friend(uuid),
  srv_list_friends(), srv_pending_requests(), srv_friend_turtles(uuid)
  to authenticated;
