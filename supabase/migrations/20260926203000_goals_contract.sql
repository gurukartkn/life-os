-- v2 Stage 5a (Goals), contract step, after 20260926170000_goals_expand.sql is on every
-- environment and the app writes only the v2 values. `status` becomes required and one of
-- active / achieved / dropped (the v1 completed / abandoned are no longer allowed), and
-- `achieved_on` is set exactly when a goal is achieved.
--
-- The expand step's clean-up runs again first, so a row written in between (by an older
-- deploy, say) is moved to the v2 values rather than failing the new checks.
begin;

update public.goals
set status = case status when 'completed' then 'achieved' when 'abandoned' then 'dropped' end
where status in ('completed', 'abandoned');
update public.goals set status = 'active' where status is null;
update public.goals g
set achieved_on = (g.updated_at at time zone coalesce(us.timezone, 'UTC'))::date
from public.goals g2
left join public.user_settings us on us.user_id = g2.user_id
where g2.id = g.id and g.status = 'achieved' and g.achieved_on is null;
update public.goals set achieved_on = null where status <> 'achieved' and achieved_on is not null;

alter table public.goals alter column status set not null;
alter table public.goals drop constraint goals_status_check;
alter table public.goals add constraint goals_status_check
  check (status in ('active', 'achieved', 'dropped'));
alter table public.goals add constraint goals_achieved_on_check
  check ((status = 'achieved') = (achieved_on is not null));

commit;
