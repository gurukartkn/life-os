begin;

alter table public.exercises add column muscle_groups text[] not null default '{}';
alter table public.exercises add column equipment text[] not null default '{}';

-- Dropping a column loses its data outright, so this doesn't just add the columns
-- back empty: it regenerates them from the join tables, which are still the source
-- of truth for every exercise's tags. Order is alphabetical, not the original array
-- order (which was never preserved anywhere once the join tables took over).
update public.exercises e
set muscle_groups = coalesce((
  select array_agg(mg.name order by mg.name)
  from public.exercise_muscle_groups emg
  join public.muscle_groups mg on mg.id = emg.muscle_group_id
  where emg.exercise_id = e.id
), '{}');

update public.exercises e
set equipment = coalesce((
  select array_agg(eq.name order by eq.name)
  from public.exercise_equipment ee
  join public.equipment eq on eq.id = ee.equipment_id
  where ee.exercise_id = e.id
), '{}');

commit;
