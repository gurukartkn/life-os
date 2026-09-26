-- v2 Goals (hi-fi mockups, Stage 5a): a goal links to tasks, routines and fitness items —
-- whole workouts or single exercises. Adds `workout` and `exercise` to the link types;
-- the existing ones stay.
begin;

alter table public.links drop constraint links_source_type_check;
alter table public.links drop constraint links_target_type_check;

alter table public.links add constraint links_source_type_check
  check (source_type in ('task', 'workout_log', 'goal', 'routine', 'workout', 'exercise'));
alter table public.links add constraint links_target_type_check
  check (target_type in ('task', 'workout_log', 'goal', 'routine', 'workout', 'exercise'));

commit;
