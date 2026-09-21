begin;
alter table public.links drop constraint links_source_type_check;
alter table public.links drop constraint links_target_type_check;
update public.links set source_type = 'todo' where source_type = 'task';
update public.links set target_type = 'todo' where target_type = 'task';
alter table public.links add constraint links_source_type_check
  check (source_type in ('todo', 'workout_log', 'goal', 'routine'));
alter table public.links add constraint links_target_type_check
  check (target_type in ('todo', 'workout_log', 'goal', 'routine'));
alter table public.tasks rename constraint tasks_user_id_fkey to todos_user_id_fkey;
alter table public.tasks rename constraint tasks_pkey to todos_pkey;
alter table public.tasks rename to todos;
commit;
