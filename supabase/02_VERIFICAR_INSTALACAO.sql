/* Execute depois do 01_RECRIAR_BANCO.sql. Nenhum dado é alterado. */

select
  t.table_name,
  c.relrowsecurity as rls_ativo
from information_schema.tables t
join pg_catalog.pg_class c on c.relname = t.table_name
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where t.table_schema = 'public'
  and n.nspname = 'public'
  and t.table_name in (
    'profiles', 'projects', 'cards', 'card_participants',
    'messages', 'notification_reads'
  )
order by table_name;

select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'projects', 'cards', 'card_participants',
    'messages', 'notification_reads'
  )
order by tablename, policyname;

select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'search_profiles', 'is_card_participant', 'is_project_participant',
    'handle_new_user', 'enforce_card_update_permissions'
  )
order by routine_name;
