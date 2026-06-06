-- TurtWatch — shared goals. Two pond pals team up on a turtle target (e.g.
-- "20 turtles together this month"); progress = each accepted member's uploads
-- since the goal started, summed. Computed on read so it's always accurate.

create table if not exists group_goal (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  target     integer not null,
  start_date date not null default current_date,
  created_by uuid not null references app_user(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists group_goal_member (
  goal_id uuid not null references group_goal(id) on delete cascade,
  user_id uuid not null references app_user(id) on delete cascade,
  status  text not null default 'pending',  -- pending | accepted
  primary key (goal_id, user_id)
);
create index if not exists group_goal_member_user on group_goal_member (user_id);
alter table group_goal enable row level security;
alter table group_goal_member enable row level security;
-- members may read their goals & co-members; all writes go through the RPCs.
create policy "gg_member_select" on group_goal_member for select
  using (user_id = auth.uid() or exists (
    select 1 from group_goal_member m2 where m2.goal_id = group_goal_member.goal_id and m2.user_id = auth.uid()));
create policy "gg_select" on group_goal for select
  using (exists (select 1 from group_goal_member m where m.goal_id = group_goal.id and m.user_id = auth.uid()));

create or replace function srv_create_group_goal(p_friend uuid, p_title text, p_target integer) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_goal uuid; v_title text; v_target int;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from friendship where status = 'accepted'
     and ((requester = v_user and addressee = p_friend) or (requester = p_friend and addressee = v_user))
  ) then raise exception 'NOT_FRIENDS'; end if;
  v_title := btrim(coalesce(p_title, ''));
  if length(v_title) < 1 or length(v_title) > 60 then raise exception 'BAD_TITLE'; end if;
  v_target := greatest(1, least(coalesce(p_target, 0), 1000));
  insert into group_goal (title, target, created_by) values (v_title, v_target, v_user) returning id into v_goal;
  insert into group_goal_member (goal_id, user_id, status) values (v_goal, v_user, 'accepted'), (v_goal, p_friend, 'pending');
  return jsonb_build_object('id', v_goal);
end $$;

create or replace function srv_respond_group_goal(p_goal uuid, p_accept boolean) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_found boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_accept then
    update group_goal_member set status = 'accepted' where goal_id = p_goal and user_id = v_user and status = 'pending';
  else
    delete from group_goal_member where goal_id = p_goal and user_id = v_user and status = 'pending';
  end if;
  get diagnostics v_found = row_count;
  if not v_found then raise exception 'NO_REQUEST'; end if;
  -- clean up a goal nobody accepted
  delete from group_goal g where g.id = p_goal and not exists (
    select 1 from group_goal_member m where m.goal_id = g.id and m.status = 'accepted');
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_leave_group_goal(p_goal uuid) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from group_goal_member where goal_id = p_goal and user_id = v_user;
  delete from group_goal g where g.id = p_goal and not exists (
    select 1 from group_goal_member m where m.goal_id = g.id and m.status = 'accepted');
  return jsonb_build_object('ok', true);
end $$;

create or replace function srv_list_group_goals() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', gg.id, 'title', gg.title, 'target', gg.target, 'startDate', gg.start_date,
      'myStatus', me.status, 'createdBy', gg.created_by,
      'members', (
        select jsonb_agg(jsonb_build_object(
          'id', u.id, 'displayName', u.display_name, 'mascot', u.mascot, 'status', m.status,
          'contribution', case when m.status = 'accepted'
            then (select count(*) from turtle_entry te where te.user_id = m.user_id and te.entry_date >= gg.start_date)
            else 0 end
        ))
        from group_goal_member m join app_user u on u.id = m.user_id where m.goal_id = gg.id
      ),
      'total', (
        select count(*) from turtle_entry te
        join group_goal_member m2 on m2.user_id = te.user_id and m2.status = 'accepted'
        where m2.goal_id = gg.id and te.entry_date >= gg.start_date
      )
    ) order by gg.created_at desc), '[]'::jsonb)
    from group_goal gg
    join group_goal_member me on me.goal_id = gg.id and me.user_id = v_user
  );
end $$;

grant execute on function
  srv_create_group_goal(uuid, text, integer), srv_respond_group_goal(uuid, boolean),
  srv_leave_group_goal(uuid), srv_list_group_goals()
  to authenticated;
