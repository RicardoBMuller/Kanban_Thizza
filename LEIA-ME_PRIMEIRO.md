
## Atualização visual FCC (tema único)

Esta versão utiliza somente o tema escuro, em uma tonalidade mais clara e com a paleta vinho/magenta da Fundação Carlos Chagas. O botão de alternância de tema foi removido. Também foram corrigidos os textos que apareciam escuros no modal de visualização do card.

**Esta atualização não exige executar nenhum SQL adicional.** Caso o banco já tenha recebido o arquivo `04_ATUALIZAR_CONCLUSAO_REABERTURA.sql`, basta manter o `config.js` com suas credenciais atuais e substituir os arquivos do GitHub Pages.

# Kanban Quest — pacote completo com conclusão, trava e reabertura

Este pacote contém o frontend completo para o GitHub Pages e os arquivos SQL do Supabase.

## Alterações desta versão

- confirmação antes de colocar um card em **Concluído**;
- card concluído fica totalmente **travado**;
- card concluído pode ser **reaberto** após nova confirmação;
- reabertura envia o card para **Em Progresso**;
- card reaberto recebe destaque vermelho/salmão e a marca d’água **REABERTO**;
- conclusão e reabertura geram notificações online para todos os participantes do card;
- datas de inclusão exibidas no projeto, no card, nos participantes, nos itens do checklist e nos comentários;
- notificações persistentes armazenadas no Supabase e atualizadas por Realtime;
- nenhuma informação do Kanban é gravada em `localStorage`.

---

# LEIA ISTO ANTES DE EXECUTAR O SQL

Existem dois cenários.

## Cenário A — seu banco atual já está instalado e possui dados

Execute somente:

`supabase/04_ATUALIZAR_CONCLUSAO_REABERTURA.sql`

Esse arquivo é uma migração **não destrutiva**. Ele preserva projetos, cards, participantes, comentários e checklists.

Depois execute:

`supabase/02_VERIFICAR_INSTALACAO.sql`

> Não execute o `01_RECRIAR_BANCO.sql` no banco atual, pois ele apaga e recria as tabelas.

## Cenário B — instalação nova em um Supabase vazio

Execute:

`supabase/01_RECRIAR_BANCO.sql`

Depois execute:

`supabase/02_VERIFICAR_INSTALACAO.sql`

---

# Conteúdo do ZIP

- `index.html` — página principal;
- `styles.css` — identidade visual, responsividade e estados dos cards;
- `app.js` — login, Kanban, participantes, conclusão, reabertura, notificações e chat;
- `config.js` — URL e Publishable key do Supabase;
- `.nojekyll` — publicação correta no GitHub Pages;
- `supabase/01_RECRIAR_BANCO.sql` — instalação completa e destrutiva para banco novo;
- `supabase/02_VERIFICAR_INSTALACAO.sql` — verificação da estrutura;
- `supabase/03_BACKUP_E_RECUPERACAO.md` — orientações de backup;
- `supabase/04_ATUALIZAR_CONCLUSAO_REABERTURA.sql` — atualização não destrutiva para o banco atual.

---

# PASSO 1 — Atualizar o banco atual

Como você já recriou o Supabase e está usando o projeto, faça assim:

1. Abra o projeto no Supabase.
2. Entre em **SQL Editor**.
3. Clique em **New query**.
4. Abra o arquivo `supabase/04_ATUALIZAR_CONCLUSAO_REABERTURA.sql`.
5. Copie todo o conteúdo.
6. Cole no SQL Editor.
7. Clique em **Run**.

O resultado esperado no final é:

`Atualização concluída sem apagar dados.`

A consulta também mostra quantos cards foram preservados.

## O que a atualização cria

- campos de data e autoria para conclusão e reabertura;
- trava de banco para impedir alteração direta em card concluído;
- função segura `transition_card_status`;
- tabela `notifications`;
- política RLS para cada usuário consultar somente as próprias notificações;
- Realtime para novas notificações;
- datas históricas de conclusão para cards que já estavam na coluna Concluído.

---

# PASSO 2 — Verificar o banco

1. Abra outra consulta no **SQL Editor**.
2. Copie `supabase/02_VERIFICAR_INSTALACAO.sql`.
3. Clique em **Run**.

No último resultado, o esperado é:

| Campo | Valor esperado |
|---|---:|
| `tabelas_encontradas` | 7 |
| `tabelas_com_rls` | 7 |
| `funcoes_encontradas` | 6 |
| `campos_status_encontrados` | 6 |
| `realtime_notificacoes` | 1 |

As tabelas são:

- `profiles`
- `projects`
- `cards`
- `card_participants`
- `messages`
- `notification_reads`
- `notifications`

---

# PASSO 3 — Conferir o config.js

Abra `config.js` e confirme que ele contém os dados do seu projeto atual:

```javascript
window.KANBAN_CONFIG = Object.freeze({
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_SUA_CHAVE"
});
```

Use somente:

- **Project URL**;
- **Publishable key**.

Nunca coloque no GitHub:

- Client Secret do Google;
- Secret key do Supabase;
- `service_role`;
- senha do banco.

---

# PASSO 4 — Publicar no GitHub Pages

1. Extraia o ZIP.
2. Abra o repositório do Kanban Quest no GitHub.
3. Substitua os arquivos antigos pelos novos.
4. Mantenha na raiz do repositório:
   - `index.html`;
   - `styles.css`;
   - `app.js`;
   - `config.js`;
   - `.nojekyll`.
5. Faça o commit.
6. Aguarde a publicação do GitHub Pages.
7. Abra o site e pressione `Ctrl + F5`.

Os arquivos da pasta `supabase` não precisam ser utilizados pelo site, mas podem permanecer no repositório como documentação. Eles não contêm senhas.

---

# PASSO 5 — Teste funcional

Use duas contas Google que já tenham entrado no Kanban Quest pelo menos uma vez.

## Testar conclusão

1. Crie um card.
2. Adicione a segunda conta como participante.
3. Salve.
4. Arraste o card para **Concluído** ou use a opção de mover dentro do card.
5. Confirme que aparece o modal de confirmação.
6. Clique em **Sim, concluir**.
7. Confirme que:
   - o card foi para Concluído;
   - aparece como **Concluído e travado**;
   - não é possível editar, comentar, marcar checklist, excluir ou arrastar;
   - a segunda conta recebe a notificação.

## Testar reabertura

1. Abra o card concluído.
2. Clique em **Reabrir card**.
3. Confirme o modal.
4. Verifique que:
   - o card voltou para **Em Progresso**;
   - voltou a aceitar alterações;
   - ficou vermelho/salmão;
   - aparece a marca d’água **REABERTO**;
   - os participantes receberam outra notificação.

## Testar datas

Confirme a exibição da data de inclusão:

- abaixo do nome do projeto;
- na parte externa do card;
- dentro do modal do card;
- em cada participante;
- em cada item do checklist;
- em cada comentário.

---

# Regras aplicadas no banco

- mover um card entre colunas usa a função `transition_card_status`;
- entrar em Concluído grava `completed_at` e `completed_by`;
- card concluído não aceita alteração direta, nem mesmo pelo dono;
- sair de Concluído grava `reopened_at`, `reopened_by` e incrementa `reopened_count`;
- a reabertura mantém o histórico da conclusão;
- notificações são criadas na mesma transação da mudança de status;
- se a mudança falhar, nenhuma notificação incompleta é criada;
- cada participante enxerga somente as notificações destinadas à própria conta.

---

# Instalação nova do zero

Em um projeto Supabase novo e vazio:

1. Execute `01_RECRIAR_BANCO.sql`.
2. Execute `02_VERIFICAR_INSTALACAO.sql`.
3. Preencha o `config.js`.
4. Configure **Authentication > URL Configuration**.
5. Configure o Google em **Authentication > Sign In / Providers**.
6. Publique os arquivos no GitHub Pages.

Para o repositório usado anteriormente, a URL costuma ser:

`https://ricardobmuller.github.io/Kanban_Thizza/`

No Google Cloud, mantenha:

**Origem JavaScript autorizada**

`https://ricardobmuller.github.io`

**URI de redirecionamento autorizada**

A Callback URL exata mostrada no novo projeto Supabase:

`https://SEU-PROJECT-REF.supabase.co/auth/v1/callback`
