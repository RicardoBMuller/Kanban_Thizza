/*
  Execute depois do 01_RECRIAR_BANCO.sql em uma instalação nova
  OU depois do 04_ATUALIZAR_CONCLUSAO_REABERTURA.sql em um banco existente.
  Nenhum dado é alterado.
*/

-- 1. As 7 tabelas devem aparecer com rls_ativo = true.
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
    'messages', 'notification_reads', 'notifications'
  )
order by table_name;

-- 2. Lista as políticas RLS do projeto.
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'projects', 'cards', 'card_participants',
    'messages', 'notification_reads', 'notifications'
  )
order by tablename, policyname;

-- 3. As 6 funções abaixo devem aparecer.
select
  routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'search_profiles', 'is_card_participant', 'is_project_participant',
    'handle_new_user', 'enforce_card_update_permissions',
    'transition_card_status'
  )
order by routine_name;

-- 4. Os 6 campos de conclusão/reabertura devem aparecer.
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cards'
  and column_name in (
    'completed_at', 'completed_by', 'reopened_at',
    'reopened_by', 'reopened_count', 'is_reopened'
  )
order by ordinal_position;

-- 5. Resumo esperado: 7 tabelas, 7 com RLS, 6 funções e 6 campos.
select
  (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'profiles', 'projects', 'cards', 'card_participants',
        'messages', 'notification_reads', 'notifications'
      )
  ) as tabelas_encontradas,
  (
    select count(*)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relrowsecurity = true
      and c.relname in (
        'profiles', 'projects', 'cards', 'card_participants',
        'messages', 'notification_reads', 'notifications'
      )
  ) as tabelas_com_rls,
  (
    select count(distinct routine_name)
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in (
        'search_profiles', 'is_card_participant', 'is_project_participant',
        'handle_new_user', 'enforce_card_update_permissions',
        'transition_card_status'
      )
  ) as funcoes_encontradas,
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name in (
        'completed_at', 'completed_by', 'reopened_at',
        'reopened_by', 'reopened_count', 'is_reopened'
      )
  ) as campos_status_encontrados,
  (
    select count(*)
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) as realtime_notificacoes;
