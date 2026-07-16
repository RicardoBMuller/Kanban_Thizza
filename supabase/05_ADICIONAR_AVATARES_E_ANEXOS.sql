/*
  KANBAN QUEST — ATUALIZAÇÃO NÃO DESTRUTIVA
  Recursos: avatares dos participantes e anexos online nos cards.
  Versão: 2026-07-16

  Este script NÃO apaga projetos, cards, comentários, checklists ou participantes.
  Execute no Supabase > SQL Editor > New query > Run.
*/

begin;

-- =============================================================
-- 1. METADADOS DOS ANEXOS NOS CARDS
-- =============================================================
alter table public.cards
  add column if not exists attachments jsonb default '[]'::jsonb;

alter table public.cards
  alter column attachments set default '[]'::jsonb;

update public.cards
set attachments = '[]'::jsonb
where attachments is null
   or jsonb_typeof(attachments) <> 'array';

alter table public.cards
  alter column attachments set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cards_attachments_is_array'
      and conrelid = 'public.cards'::regclass
  ) then
    alter table public.cards
      add constraint cards_attachments_is_array
      check (jsonb_typeof(attachments) = 'array');
  end if;
end;
$$;

-- =============================================================
-- 2. FUNÇÕES SEGURAS PARA AS POLÍTICAS DO STORAGE
-- =============================================================
create or replace function public.is_card_owner(p_card_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cards c
    where c.id = p_card_id
      and c.owner_id = auth.uid()
  );
$$;

create or replace function public.can_access_card_attachment(p_card_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cards c
    where c.id = p_card_id
      and (
        c.owner_id = auth.uid()
        or public.is_card_participant(c.id)
      )
  );
$$;

create or replace function public.can_edit_card_attachment(p_card_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.cards c
    where c.id = p_card_id
      and c.column_key <> 'done'
      and (
        c.owner_id = auth.uid()
        or public.is_card_participant(c.id)
      )
  );
$$;

revoke all on function public.is_card_owner(text) from public, anon;
grant execute on function public.is_card_owner(text) to authenticated;

revoke all on function public.can_access_card_attachment(text) from public, anon;
grant execute on function public.can_access_card_attachment(text) to authenticated;

revoke all on function public.can_edit_card_attachment(text) from public, anon;
grant execute on function public.can_edit_card_attachment(text) to authenticated;

-- =============================================================
-- 3. PERMISSÕES DOS PARTICIPANTES
-- Participantes passam a poder atualizar o campo attachments, mantendo
-- todas as demais restrições existentes.
-- =============================================================
create or replace function public.enforce_card_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

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
      raise exception 'Participantes só podem editar título, descrição, checklist, comentários e anexos.'
        using errcode = '42501';
    end if;

    -- Um participante só pode acrescentar, alterar ou remover anexos enviados
    -- por ele próprio. Anexos de outros usuários permanecem protegidos.
    if new.attachments is distinct from old.attachments then
      if exists (
        select 1
        from jsonb_array_elements(coalesce(new.attachments, '[]'::jsonb)) n
        where not exists (
          select 1
          from jsonb_array_elements(coalesce(old.attachments, '[]'::jsonb)) o
          where o ->> 'id' = n ->> 'id'
        )
        and coalesce(n ->> 'uploadedBy', n ->> 'uploaded_by', '') <> auth.uid()::text
      ) then
        raise exception 'Participantes só podem adicionar anexos em seu próprio nome.'
          using errcode = '42501';
      end if;

      if exists (
        select 1
        from jsonb_array_elements(coalesce(old.attachments, '[]'::jsonb)) o
        where coalesce(o ->> 'uploadedBy', o ->> 'uploaded_by', '') <> auth.uid()::text
          and not exists (
            select 1
            from jsonb_array_elements(coalesce(new.attachments, '[]'::jsonb)) n
            where n ->> 'id' = o ->> 'id'
              and n = o
          )
      ) then
        raise exception 'Participantes não podem alterar ou remover anexos enviados por outras pessoas.'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  raise exception 'Sem permissão para editar este card.' using errcode = '42501';
end;
$$;

drop trigger if exists cards_enforce_update_permissions on public.cards;
create trigger cards_enforce_update_permissions
before update on public.cards
for each row execute function public.enforce_card_update_permissions();

-- =============================================================
-- 4. BUCKET PRIVADO E POLÍTICAS DE ACESSO
-- Caminho gerado pelo aplicativo:
-- card_id/owner_id/uploader_id/nome-do-arquivo
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('card-attachments', 'card-attachments', false, 15728640)
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640;

drop policy if exists card_attachments_select on storage.objects;
create policy card_attachments_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-attachments'
  and public.can_access_card_attachment((storage.foldername(name))[1])
);

drop policy if exists card_attachments_insert on storage.objects;
create policy card_attachments_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-attachments'
  and public.can_edit_card_attachment((storage.foldername(name))[1])
  and (storage.foldername(name))[2] = (
    select c.owner_id::text
    from public.cards c
    where c.id = (storage.foldername(name))[1]
  )
  and (storage.foldername(name))[3] = (select auth.uid())::text
);

drop policy if exists card_attachments_delete on storage.objects;
create policy card_attachments_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'card-attachments'
  and (
    (
      public.can_edit_card_attachment((storage.foldername(name))[1])
      and (
        public.is_card_owner((storage.foldername(name))[1])
        or (storage.foldername(name))[3] = (select auth.uid())::text
      )
    )
    or (
      (storage.foldername(name))[2] = (select auth.uid())::text
      and not exists (
        select 1 from public.cards c
        where c.id = (storage.foldername(name))[1]
      )
    )
  )
);

commit;

select
  'Atualização concluída sem apagar dados.' as resultado,
  (select count(*) from public.cards) as cards_preservados,
  (select count(*) from storage.buckets where id = 'card-attachments') as bucket_criado;
