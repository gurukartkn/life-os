-- Inverse of migrations/20260926170000_goals_expand.sql. The link type widening is left in
-- place: it is the same set 20260926150000_links_workout_exercise.sql already allows.
begin;
drop index if exists public.links_target_idx;
alter table public.links drop constraint if exists links_goal_is_source_check;
update public.goals
set status = case status when 'achieved' then 'completed' when 'dropped' then 'abandoned' end
where status in ('achieved', 'dropped');
alter table public.goals alter column status drop default;
alter table public.goals drop constraint goals_status_check;
alter table public.goals add constraint goals_status_check
  check (status in ('active', 'completed', 'abandoned'));
alter table public.goals drop column achieved_on;
commit;
