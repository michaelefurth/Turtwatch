-- TurtWatch — friend "cheers" (little encouragements between pond pals).
-- Send a cheer emoji to an accepted friend; they see it on the Friends screen.

create table if not exists cheer (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references app_user(id) on delete cascade,
  to_user    uuid not null references app_user(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  seen       boolean not null default false
);
create index if not exists cheer_to on cheer (to_user, seen);
alter table cheer enable row level security;
-- recipients can read their own cheers; sending happens via the RPC below.
create policy "own_cheer_select" on cheer for select using (to_user = auth.uid());

create or replace function srv_send_cheer(p_friend uuid, p_emoji text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from friendship where status = 'accepted'
     and ((requester = v_user and addressee = p_friend) or (requester = p_friend and addressee = v_user))
  ) then raise exception 'NOT_FRIENDS'; end if;
  -- light anti-spam: one cheer per friend per 30s
  if exists (select 1 from cheer where from_user = v_user and to_user = p_friend and created_at > now() - interval '30 seconds') then
    raise exception 'TOO_SOON';
  end if;
  insert into cheer (from_user, to_user, emoji) values (v_user, p_friend, left(coalesce(nullif(p_emoji, ''), '👏'), 8));
  return jsonb_build_object('ok', true);
end $$;

-- Returns recent received cheers + unseen count, then marks them seen.
create or replace function srv_list_cheers() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_list jsonb; v_unseen int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select count(*) into v_unseen from cheer where to_user = v_user and not seen;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'emoji', c.emoji, 'from', u.id, 'username', u.username,
    'displayName', u.display_name, 'createdAt', c.created_at, 'seen', c.seen
  ) order by c.created_at desc), '[]'::jsonb)
  into v_list
  from (select * from cheer where to_user = v_user order by created_at desc limit 30) c
  join app_user u on u.id = c.from_user;
  update cheer set seen = true where to_user = v_user and not seen;
  return jsonb_build_object('unseen', v_unseen, 'cheers', v_list);
end $$;

grant execute on function srv_send_cheer(uuid, text), srv_list_cheers() to authenticated;
