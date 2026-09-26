-- v2 Stage 5a (Goals), expand step. Goals gain `achieved_on` (the local date a goal was
-- achieved) and the v2 status values `achieved` / `dropped`, which existing rows move to;
-- the old values stay allowed until the contract migration narrows the check. Links gain
-- `workout` and `exercise` as types, a goal may only be a link's source, and links get a
-- target-side index for the per-item clean-up on delete.
begin;
alter table public.goals add column if not exists achieved_on date;
alter table public.goals drop constraint if exists goals_status_check;
alter table public.goals add constraint goals_status_check
  check (status in ('active', 'achieved', 'dropped', 'completed', 'abandoned'));
update public.goals
set status = case status when 'completed' then 'achieved' when 'abandoned' then 'dropped' end
where status in ('completed', 'abandoned');
update public.goals set status = 'active' where status is null;
alter table public.goals alter column status set default 'active';
update public.goals g
set achieved_on = (g.updated_at at time zone coalesce(us.timezone, 'UTC'))::date
from public.goals g2
left join public.user_settings us on us.user_id = g2.user_id
where g2.id = g.id and g.status = 'achieved' and g.achieved_on is null;
alter table public.links drop constraint if exists links_source_type_check;
alter table public.links drop constraint if exists links_target_type_check;
alter table public.links
  add constraint links_source_type_check check (source_type in
    ('task', 'workout_log', 'goal', 'routine', 'workout', 'exercise')),
  add constraint links_target_type_check check (target_type in
    ('task', 'workout_log', 'goal', 'routine', 'workout', 'exercise'));
alter table public.links drop constraint if exists links_goal_is_source_check;
alter table public.links add constraint links_goal_is_source_check
  check (target_type <> 'goal');
create index if not exists links_target_idx on public.links (target_type, target_id);
commit;
