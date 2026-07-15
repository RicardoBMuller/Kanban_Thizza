/*
  KANBAN QUEST — RECRIAÇÃO COMPLETA DO BANCO SUPABASE
  Versão: 2026-07-15 — conclusão, trava, reabertura e notificações

  ATENÇÃO: este script APAGA e recria as tabelas do Kanban Quest no schema public.
  Use em um projeto novo/vazio ou quando você realmente quiser reiniciar o banco.

  Execute o arquivo inteiro no Supabase Dashboard > SQL Editor > New query > Run.
*/

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Remove objetos antigos do aplicativo, caso existam.
drop function if exists public.search_profiles(text) cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_card_participant(text) cascade;
drop function if exists public.is_project_participant(text) cascade;
drop function if exists public.enforce_card_update_permissions() cascade;
drop function if exists public.enforce_message_update_permissions() cascade;
drop function if exists public.transition_card_status(text, text) cascade;

drop table if exists public.notification_reads cascade;
drop table if exists public.notifications cascade;
drop table if exists public.messages cascade;
drop table if exists public.card_participants cascade;
drop table if exists public.cards cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;

-- =============================================================
-- PERFIS
-- =============================================================
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Usuário',
  email text not null default '',
  avatar_url text,
  phone text,
  sector text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_email_trgm_idx
  on public.profiles using gin (email gin_trgm_ops);

-- =============================================================
-- PROJETOS
-- =============================================================
create table public.projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_owner_unique unique (id, owner_id)
);

create unique index projects_owner_name_unique_idx
  on public.projects (owner_id, lower(name));
create index projects_owner_created_idx
  on public.projects (owner_id, created_at);

-- =============================================================
-- CARDS
-- =============================================================
create table public.cards (
  id text primary key,
  owner_id uuid not null,
  project_id text not null,
  column_key text not null default 'todo'
    check (column_key in ('todo', 'doing', 'done')),
  position integer not null default 0 check (position >= 0),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  description text not null default '',
  owner text not null default '',
  due_date date,
  labels jsonb not null default '[]'::jsonb
    check (jsonb_typeof(labels) = 'array'),
  participants jsonb not null default '[]'::jsonb
    check (jsonb_typeof(participants) = 'array'),
  checklist jsonb not null default '[]'::jsonb
    check (jsonb_typeof(checklist) = 'array'),
  comments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(comments) = 'array'),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  reopened_count integer not null default 0,
  is_reopened boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_reopened_count_nonnegative check (reopened_count >= 0),
  constraint cards_project_owner_fk
    foreign key (project_id, owner_id)
    references public.projects(id, owner_id)
    on delete cascade,
  constraint cards_id_owner_project_unique
    unique (id, owner_id, project_id)
);

create index cards_owner_position_idx
  on public.cards (owner_id, project_id, column_key, position);
create index cards_project_position_idx
  on public.cards (project_id, column_key, position);
create index cards_due_date_idx
  on public.cards (owner_id, due_date)
  where due_date is not null;

-- =============================================================
-- PARTICIPANTES DOS CARDS
-- =============================================================
create table public.card_participants (
  card_id text not null,
  participant_user_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null,
  project_id text not null,
  participant_name text,
  participant_email text,
  participant_avatar_url text,
  created_at timestamptz not null default now(),
  primary key (card_id, participant_user_id),
  constraint card_participants_card_fk
    foreign key (card_id, owner_id, project_id)
    references public.cards(id, owner_id, project_id)
    on delete cascade,
  constraint participant_cannot_be_owner
    check (participant_user_id <> owner_id)
);

create index card_participants_user_idx
  on public.card_participants (participant_user_id, card_id);
create index card_participants_project_user_idx
  on public.card_participants (project_id, participant_user_id);
create index card_participants_owner_card_idx
  on public.card_participants (owner_id, card_id);

-- =============================================================
-- CHAT
-- =============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 5000),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_different_users check (from_user_id <> to_user_id)
);

create index messages_from_created_idx
  on public.messages (from_user_id, created_at desc);
create index messages_to_created_idx
  on public.messages (to_user_id, created_at desc);
create index messages_unread_idx
  on public.messages (to_user_id, read, created_at desc);

-- =============================================================
-- NOTIFICAÇÕES LIDAS (estado online, sem localStorage)
-- =============================================================
create table public.notification_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index notification_reads_user_idx
  on public.notification_reads (user_id, read_at desc);

-- =============================================================
-- NOTIFICAÇÕES PERSISTENTES DE STATUS
-- =============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('card_completed', 'card_reopened')),
  card_id text not null references public.cards(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_card_created_idx
  on public.notifications (card_id, created_at desc);

-- =============================================================
-- FUNÇÕES AUXILIARES
-- =============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger cards_set_updated_at
before update on public.cards
for each row execute function public.set_updated_at();

create trigger messages_set_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

-- Cria/atualiza o perfil automaticamente quando um usuário entra pelo Google.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Usuário'
    ),
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- Funções SECURITY DEFINER evitam recursão entre políticas RLS.
create or replace function public.is_card_participant(p_card_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.card_participants cp
    where cp.card_id = p_card_id
      and cp.participant_user_id = auth.uid()
  );
$$;

create or replace function public.is_project_participant(p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.card_participants cp
    where cp.project_id = p_project_id
      and cp.participant_user_id = auth.uid()
  );
$$;

-- Trava cards concluídos e exige a função de transição para concluir/reabrir.
create or replace function public.enforce_card_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- SQL Editor, migrações e operações administrativas não têm auth.uid().
  if auth.uid() is null then
    return new;
  end if;

  -- A RPC de status valida a autorização antes de habilitar esta exceção local.
  if current_setting('app.card_transition', true) = '1' then
    return new;
  end if;

  -- Depois da conclusão, nenhuma alteração direta é aceita.
  if old.column_key = 'done' then
    raise exception 'Este card está concluído e travado. Reabra-o antes de alterar.'
      using errcode = '42501';
  end if;

  -- Mudanças de coluna/status passam exclusivamente pela RPC, que confirma,
  -- registra datas e cria as notificações dos participantes.
  if new.column_key is distinct from old.column_key
     or new.completed_at is distinct from old.completed_at
     or new.completed_by is distinct from old.completed_by
     or new.reopened_at is distinct from old.reopened_at
     or new.reopened_by is distinct from old.reopened_by
     or new.reopened_count is distinct from old.reopened_count
     or new.is_reopened is distinct from old.is_reopened then
    raise exception 'Use transition_card_status para mover, concluir ou reabrir este card.'
      using errcode = '42501';
  end if;

  -- O dono pode editar o card enquanto ele não estiver concluído.
  if auth.uid() = old.owner_id then
    return new;
  end if;

  -- Participantes podem alterar somente os campos colaborativos.
  if public.is_card_participant(old.id) then
    if new.id is distinct from old.id
       or new.owner_id is distinct from old.owner_id
       or new.project_id is distinct from old.project_id
       or new.position is distinct from old.position
       or new.owner is distinct from old.owner
       or new.due_date is distinct from old.due_date
       or new.labels is distinct from old.labels
       or new.participants is distinct from old.participants
       or new.created_at is distinct from old.created_at then
      raise exception 'Participantes só podem editar título, descrição, checklist e comentários.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Sem permissão para editar este card.' using errcode = '42501';
end;
$$;

create trigger cards_enforce_update_permissions
before update on public.cards
for each row execute function public.enforce_card_update_permissions();

-- Única porta de entrada para mover, concluir ou reabrir cards.
-- A operação é atômica: muda o status, grava as datas e notifica participantes.
create or replace function public.transition_card_status(
  p_card_id text,
  p_target_column text
)
returns public.cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.cards%rowtype;
  v_updated public.cards%rowtype;
  v_position integer;
  v_actor_name text;
  v_event_type text;
  v_notification_title text;
  v_notification_body text;
begin
  if auth.uid() is null then
    raise exception 'É necessário estar autenticado.' using errcode = '42501';
  end if;

  if p_target_column not in ('todo', 'doing', 'done') then
    raise exception 'Coluna de destino inválida.' using errcode = '22023';
  end if;

  select *
    into v_card
    from public.cards
   where id = p_card_id
   for update;

  if not found then
    raise exception 'Card não encontrado.' using errcode = 'P0002';
  end if;

  if auth.uid() <> v_card.owner_id
     and not exists (
       select 1
         from public.card_participants cp
        where cp.card_id = v_card.id
          and cp.participant_user_id = auth.uid()
     ) then
    raise exception 'Sem permissão para alterar o status deste card.' using errcode = '42501';
  end if;

  if v_card.column_key = p_target_column then
    return v_card;
  end if;

  select coalesce(max(c.position), -1) + 1
    into v_position
    from public.cards c
   where c.project_id = v_card.project_id
     and c.column_key = p_target_column
     and c.id <> v_card.id;

  select coalesce(nullif(p.full_name, ''), nullif(p.email, ''), 'Um participante')
    into v_actor_name
    from public.profiles p
   where p.user_id = auth.uid();
  v_actor_name := coalesce(v_actor_name, 'Um participante');

  -- Libera somente a atualização executada dentro desta transação/RPC.
  perform set_config('app.card_transition', '1', true);

  if p_target_column = 'done' and v_card.column_key <> 'done' then
    update public.cards
       set column_key = 'done',
           position = v_position,
           completed_at = now(),
           completed_by = auth.uid(),
           is_reopened = false
     where id = v_card.id
     returning * into v_updated;

    v_event_type := 'card_completed';
    v_notification_title := 'Card concluído';
    v_notification_body := v_actor_name || ' concluiu o card “' || v_card.title || '”. O card está travado até ser reaberto.';

  elsif v_card.column_key = 'done' and p_target_column <> 'done' then
    update public.cards
       set column_key = p_target_column,
           position = v_position,
           reopened_at = now(),
           reopened_by = auth.uid(),
           reopened_count = coalesce(reopened_count, 0) + 1,
           is_reopened = true
     where id = v_card.id
     returning * into v_updated;

    v_event_type := 'card_reopened';
    v_notification_title := 'Card reaberto';
    v_notification_body := v_actor_name || ' reabriu o card “' || v_card.title || '”. Ele voltou para Em Progresso e está destacado como REABERTO.';

  else
    update public.cards
       set column_key = p_target_column,
           position = v_position
     where id = v_card.id
     returning * into v_updated;
  end if;

  if v_event_type is not null then
    insert into public.notifications (
      user_id, actor_user_id, event_type, card_id, project_id, title, body
    )
    select
      cp.participant_user_id,
      auth.uid(),
      v_event_type,
      v_card.id,
      v_card.project_id,
      v_notification_title,
      v_notification_body
    from public.card_participants cp
    where cp.card_id = v_card.id;
  end if;

  return v_updated;
end;
$$;

-- O destinatário pode alterar somente o status de leitura da mensagem.
create or replace function public.enforce_message_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() <> old.to_user_id then
    raise exception 'Somente o destinatário pode marcar a mensagem como lida.'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.from_user_id is distinct from old.from_user_id
     or new.to_user_id is distinct from old.to_user_id
     or new.text is distinct from old.text
     or new.created_at is distinct from old.created_at then
    raise exception 'Só é permitido alterar o status de leitura da mensagem.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger messages_enforce_update_permissions
before update on public.messages
for each row execute function public.enforce_message_update_permissions();

-- Busca segura de usuários já cadastrados.
create or replace function public.search_profiles(search_term text)
returns table (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.user_id, p.full_name, p.email, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.user_id <> auth.uid()
    and char_length(btrim(coalesce(search_term, ''))) >= 2
    and (
      p.full_name ilike '%' || btrim(search_term) || '%'
      or p.email ilike '%' || btrim(search_term) || '%'
    )
  order by
    case when lower(p.email) = lower(btrim(search_term)) then 0 else 1 end,
    p.full_name
  limit 8;
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.cards enable row level security;
alter table public.card_participants enable row level security;
alter table public.messages enable row level security;
alter table public.notification_reads enable row level security;
alter table public.notifications enable row level security;

-- Perfis: usuários autenticados podem consultar perfis; cada usuário edita o próprio.
create policy profiles_select_authenticated
on public.profiles for select
to authenticated
using (true);

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy profiles_update_own
on public.profiles for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy profiles_delete_own
on public.profiles for delete
to authenticated
using (user_id = (select auth.uid()));

-- Projetos: dono tem CRUD; participante pode visualizar o projeto relacionado ao card.
create policy projects_select_owner_or_participant
on public.projects for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_project_participant(id)
);

create policy projects_insert_owner
on public.projects for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy projects_update_owner
on public.projects for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy projects_delete_owner
on public.projects for delete
to authenticated
using (owner_id = (select auth.uid()));

-- Cards: dono tem CRUD; participante pode visualizar e atualizar campos colaborativos.
create policy cards_select_owner_or_participant
on public.cards for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_card_participant(id)
);

create policy cards_insert_owner
on public.cards for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy cards_update_owner_or_participant
on public.cards for update
to authenticated
using (
  owner_id = (select auth.uid())
  or public.is_card_participant(id)
)
with check (
  owner_id = (select auth.uid())
  or public.is_card_participant(id)
);

create policy cards_delete_owner
on public.cards for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and column_key <> 'done'
);

-- Participações: dono gerencia; participante lê apenas a própria participação.
create policy card_participants_select_owner_or_self
on public.card_participants for select
to authenticated
using (
  owner_id = (select auth.uid())
  or participant_user_id = (select auth.uid())
);

create policy card_participants_insert_owner
on public.card_participants for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.cards c
    where c.id = card_id
      and c.owner_id = (select auth.uid())
      and c.project_id = project_id
      and c.column_key <> 'done'
  )
);

create policy card_participants_update_owner
on public.card_participants for update
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.cards c
    where c.id = card_id and c.column_key <> 'done'
  )
)
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.cards c
    where c.id = card_id and c.column_key <> 'done'
  )
);

create policy card_participants_delete_owner
on public.card_participants for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.cards c
    where c.id = card_id and c.column_key <> 'done'
  )
);

-- Chat: somente remetente e destinatário acessam a conversa.
create policy messages_select_participants
on public.messages for select
to authenticated
using (
  from_user_id = (select auth.uid())
  or to_user_id = (select auth.uid())
);

create policy messages_insert_sender
on public.messages for insert
to authenticated
with check (
  from_user_id = (select auth.uid())
  and to_user_id <> (select auth.uid())
);

create policy messages_update_recipient
on public.messages for update
to authenticated
using (to_user_id = (select auth.uid()))
with check (to_user_id = (select auth.uid()));

create policy messages_delete_participants
on public.messages for delete
to authenticated
using (
  from_user_id = (select auth.uid())
  or to_user_id = (select auth.uid())
);

-- Notificações lidas: cada usuário acessa somente o próprio estado.
create policy notification_reads_select_own
on public.notification_reads for select
to authenticated
using (user_id = (select auth.uid()));

create policy notification_reads_insert_own
on public.notification_reads for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy notification_reads_update_own
on public.notification_reads for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy notification_reads_delete_own
on public.notification_reads for delete
to authenticated
using (user_id = (select auth.uid()));

-- Notificações de status: cada usuário lê somente as próprias.
-- Inserções são feitas exclusivamente pela função transition_card_status.
create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = (select auth.uid()));

-- =============================================================
-- PERMISSÕES DA DATA API
-- =============================================================
revoke all on table public.profiles from anon;
revoke all on table public.projects from anon;
revoke all on table public.cards from anon;
revoke all on table public.card_participants from anon;
revoke all on table public.messages from anon;
revoke all on table public.notification_reads from anon;
revoke all on table public.notifications from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;
grant select, insert, update, delete on table public.card_participants to authenticated;
grant select, insert, update, delete on table public.messages to authenticated;
grant select, insert, update, delete on table public.notification_reads to authenticated;
revoke all on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;

revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

revoke all on function public.is_card_participant(text) from public, anon;
grant execute on function public.is_card_participant(text) to authenticated;

revoke all on function public.is_project_participant(text) from public, anon;
grant execute on function public.is_project_participant(text) to authenticated;

revoke all on function public.transition_card_status(text, text) from public, anon;
grant execute on function public.transition_card_status(text, text) to authenticated;

-- Habilita INSERTs da tabela de notificações no Realtime do Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;

commit;

-- Resultado esperado: 7 tabelas, RLS habilitado, cards concluídos travados e notificações online.
select 'Kanban Quest instalado com sucesso.' as resultado;
