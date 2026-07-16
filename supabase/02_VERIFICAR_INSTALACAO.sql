/*
  KANBAN QUEST — VERIFICAÇÃO DA INSTALAÇÃO

  Execute depois de:
  - 01_RECRIAR_BANCO.sql, em uma instalação nova; ou
  - 04_ATUALIZAR_CONCLUSAO_REABERTURA.sql e
    05_ADICIONAR_AVATARES_E_ANEXOS.sql, em um banco existente.

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

-- 2. Lista as políticas RLS das tabelas públicas.
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

-- 3. As 9 funções abaixo devem aparecer.
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'search_profiles', 'is_card_participant', 'is_project_participant',
    'handle_new_user', 'enforce_card_update_permissions',
    'transition_card_status', 'is_card_owner',
    'can_access_card_attachment', 'can_edit_card_attachment'
  )
order by routine_name;

-- 4. Os 7 campos abaixo devem aparecer na tabela cards.
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
    'reopened_by', 'reopened_count', 'is_reopened', 'attachments'
  )
order by ordinal_position;

-- 5. O bucket privado de anexos deve aparecer com limite de 15 MB.
select
  id,
  name,
  public,
  file_size_limit
from storage.buckets
where id = 'card-attachments';

-- 6. As três políticas do Storage devem aparecer.
select
  schemaname,
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'card_attachments_select',
    'card_attachments_insert',
    'card_attachments_delete'
  )
order by policyname;

-- 7. Resumo esperado:
-- tabelas_encontradas = 7
-- tabelas_com_rls = 7
-- funcoes_encontradas = 9
-- campos_card_encontrados = 7
-- realtime_notificacoes = 1
-- bucket_anexos = 1
-- politicas_storage = 3
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
        'transition_card_status', 'is_card_owner',
        'can_access_card_attachment', 'can_edit_card_attachment'
      )
  ) as funcoes_encontradas,
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cards'
      and column_name in (
        'completed_at', 'completed_by', 'reopened_at',
        'reopened_by', 'reopened_count', 'is_reopened', 'attachments'
      )
  ) as campos_card_encontrados,
  (
    select count(*)
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) as realtime_notificacoes,
  (
    select count(*) from storage.buckets where id = 'card-attachments'
  ) as bucket_anexos,
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'card_attachments_select',
        'card_attachments_insert',
        'card_attachments_delete'
      )
  ) as politicas_storage;
