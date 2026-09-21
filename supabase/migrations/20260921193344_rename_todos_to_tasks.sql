begin;
alter table public.todos rename to tasks;
alter table public.tasks rename constraint todos_pkey to tasks_pkey;
alter table public.tasks rename constraint todos_user_id_fkey to tasks_user_id_fkey;
alter table public.links drop constraint links_source_type_check;
alter table public.links drop constraint links_target_type_check;
update public.links set source_type = 'task' where source_type = 'todo';
update public.links set target_type = 'task' where target_type = 'todo';
alter table public.links add constraint links_source_type_check
  check (source_type in ('task', 'workout_log', 'goal', 'routine'));
alter table public.links add constraint links_target_type_check
  check (target_type in ('task', 'workout_log', 'goal', 'routine'));
commit;
