-- Inverse of migrations/20260926150000_links_workout_exercise.sql. Links to workouts and
-- exercises can't be expressed in the old types, so they are removed first.
begin;

delete from public.links where source_type in ('workout', 'exercise') or target_type in ('workout', 'exercise');

alter table public.links drop constraint links_source_type_check;
alter table public.links drop constraint links_target_type_check;

alter table public.links add constraint links_source_type_check
  check (source_type in ('task', 'workout_log', 'goal', 'routine'));
alter table public.links add constraint links_target_type_check
  check (target_type in ('task', 'workout_log', 'goal', 'routine'));

commit;
