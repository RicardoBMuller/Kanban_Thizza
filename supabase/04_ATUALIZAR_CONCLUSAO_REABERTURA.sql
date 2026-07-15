/*
  KANBAN QUEST — ATUALIZAÇÃO NÃO DESTRUTIVA
  Recursos: conclusão com confirmação, trava, reabertura, destaque e notificações.

  USE ESTE ARQUIVO no banco que você já recriou anteriormente.
  Ele NÃO apaga projetos, cards, participantes, comentários ou checklists.

  Supabase > SQL Editor > New query > cole o arquivo inteiro > Run.
*/

begin;

-- =============================================================
-- 1. NOVOS CAMPOS DE STATUS NOS CARDS
-- =============================================================
alter table public.cards
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id) on delete set null,
  add column if not exists reopened_count integer not null default 0,
  add column if not exists is_reopened boolean not null default false;

-- Adiciona a validação apenas se ainda não existir.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_reopened_count_nonnegative'
      and conrelid = 'public.cards'::regclass
  ) then
    alter table public.cards
      add constraint cards_reopened_count_nonnegative
      check (reopened_count >= 0);
  end if;
end;
$$;

-- Cards que já estavam em Concluído recebem uma data histórica coerente.
update public.cards
set completed_at = coalesce(completed_at, updated_at, created_at),
    completed_by = coalesce(completed_by, owner_id),
    is_reopened = false
where column_key = 'done';

-- =============================================================
-- 2. NOTIFICAÇÕES PERSISTENTES
-- =============================================================
create table if not exists public.notifications (
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

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_card_created_idx
  on public.notifications (card_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
on public.notifications for select
to authenticated
using (user_id = (select auth.uid()));

revoke all on table public.notifications from anon;
revoke all on table public.notifications from authenticated;
grant select on table public.notifications to authenticated;

-- =============================================================
-- 3. TRAVA DE CARDS CONCLUÍDOS
-- =============================================================
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

  -- Exceção usada somente pela RPC de status após validar o usuário.
  if current_setting('app.card_transition', true) = '1' then
    return new;
  end if;

  if old.column_key = 'done' then
    raise exception 'Este card está concluído e travado. Reabra-o antes de alterar.'
      using errcode = '42501';
  end if;

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

  if auth.uid() = old.owner_id then
    return new;
  end if;

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

-- Garante que existe apenas um trigger de permissão com a regra nova.
drop trigger if exists cards_enforce_update_permissions on public.cards;
create trigger cards_enforce_update_permissions
before update on public.cards
for each row execute function public.enforce_card_update_permissions();

-- =============================================================
-- 4. FUNÇÃO ATÔMICA PARA MOVER, CONCLUIR E REABRIR
-- =============================================================
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

revoke all on function public.transition_card_status(text, text) from public, anon;
grant execute on function public.transition_card_status(text, text) to authenticated;

-- Cards concluídos também não podem ser excluídos diretamente.
drop policy if exists cards_delete_owner on public.cards;
create policy cards_delete_owner
on public.cards for delete
to authenticated
using (
  owner_id = (select auth.uid())
  and column_key <> 'done'
);

-- Participantes de cards concluídos não podem ser incluídos, alterados ou removidos.
drop policy if exists card_participants_insert_owner on public.card_participants;
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

drop policy if exists card_participants_update_owner on public.card_participants;
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

drop policy if exists card_participants_delete_owner on public.card_participants;
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

-- =============================================================
-- 5. REALTIME PARA AS NOTIFICAÇÕES
-- =============================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;

commit;

select
  'Atualização concluída sem apagar dados.' as resultado,
  (select count(*) from public.cards) as cards_preservados,
  (select count(*) from public.notifications) as notificacoes_existentes;
