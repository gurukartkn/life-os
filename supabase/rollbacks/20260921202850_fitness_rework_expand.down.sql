begin;
alter table public.workout_logs drop column performed_at;
drop table public.exercise_equipment;
drop table public.exercise_muscle_groups;
drop table public.equipment;
drop table public.muscle_groups;
commit;
