# Backup e recuperação do Kanban Quest

O arquivo `01_RECRIAR_BANCO.sql` recupera a **estrutura**, mas não recupera projetos e cards já apagados. Para evitar uma nova perda, mantenha também cópias dos dados.

## Opção 1 — Backups do painel

No Supabase, abra **Database > Backups** e confira periodicamente se existem pontos de backup disponíveis para o projeto.

A disponibilidade e o período de retenção podem variar de acordo com o plano e a configuração do projeto.

## Opção 2 — Dump manual com Supabase CLI

A documentação oficial recomenda o comando `supabase db dump` para gerar um backup lógico.

Exemplo de estrutura:

```powershell
supabase db dump --db-url "SUA_CONNECTION_STRING" -f schema.sql
supabase db dump --db-url "SUA_CONNECTION_STRING" -f data.sql --use-copy --data-only
```

A connection string pode ser copiada em **Connect** no painel do Supabase. Não coloque essa string no GitHub, pois ela contém a senha do banco.

## Rotina recomendada

- mantenha `01_RECRIAR_BANCO.sql` e as migrações, como `04_ATUALIZAR_CONCLUSAO_REABERTURA.sql`, no repositório;
- gere um dump de dados antes de alterações grandes ou de executar uma nova migração;
- confira **Database > Backups** ao menos uma vez por mês;
- nunca exclua um projeto Supabase antes de baixar o backup;
- guarde a senha do banco em um gerenciador de senhas;
- nunca publique Secret key, service_role ou connection string.

Documentação oficial:

- `https://supabase.com/docs/guides/platform/backups`
- `https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore`
