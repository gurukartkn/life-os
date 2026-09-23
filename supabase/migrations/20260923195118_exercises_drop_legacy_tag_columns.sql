-- Contract migration for the v2 Stage 3 fitness rework (deferred from
-- 20260921202850_fitness_rework_expand.sql until every screen and script moved
-- off these columns onto muscle_groups/equipment and their join tables).
begin;

alter table public.exercises drop column muscle_groups;
alter table public.exercises drop column equipment;

commit;
