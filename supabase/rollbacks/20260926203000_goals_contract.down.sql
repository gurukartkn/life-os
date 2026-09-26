-- Inverse of migrations/20260926203000_goals_contract.sql: back to the expand step's
-- shape — status nullable and allowing the v1 values again, no achieved_on check. The
-- data stays in the v2 values, which the widened check still allows.
begin;

alter table public.goals drop constraint if exists goals_achieved_on_check;
alter table public.goals drop constraint goals_status_check;
alter table public.goals add constraint goals_status_check
  check (status in ('active', 'achieved', 'dropped', 'completed', 'abandoned'));
alter table public.goals alter column status drop not null;

commit;
