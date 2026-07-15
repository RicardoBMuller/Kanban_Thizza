# Kanban Quest — reinstalação completa

Este pacote contém o frontend pronto para GitHub Pages e toda a estrutura necessária para recriar o projeto no Supabase.

## O que existe no ZIP

- `index.html` — página principal.
- `styles.css` — identidade visual e responsividade.
- `app.js` — regras do Kanban, login, cards, participantes, chat e notificações.
- `config.js` — único arquivo em que você cola a URL e a Publishable key do Supabase.
- `.nojekyll` — evita interferência do Jekyll no GitHub Pages.
- `supabase/01_RECRIAR_BANCO.sql` — cria tabelas, relacionamentos, índices, funções, gatilhos e RLS.
- `supabase/02_VERIFICAR_INSTALACAO.sql` — confere se a instalação foi concluída.
- `supabase/03_BACKUP_E_RECUPERACAO.md` — rotina recomendada para não perder os dados novamente.

> **Importante:** o arquivo `01_RECRIAR_BANCO.sql` é destrutivo. Ele apaga as tabelas antigas do Kanban Quest e as recria. Use em um projeto novo/vazio ou quando realmente quiser reiniciar.

---

# PARTE 1 — Criar um novo projeto no Supabase

1. Entre em `https://supabase.com/dashboard`.
2. Clique em **New project**.
3. Escolha a organização.
4. Preencha:
   - **Name:** `Kanban Quest`;
   - **Database Password:** crie uma senha forte e guarde-a;
   - **Region:** escolha uma região próxima dos usuários. Para uso no Brasil, selecione a região sul-americana disponível no painel, quando houver.
5. Clique em **Create new project**.
6. Aguarde o projeto ficar disponível.

---

# PARTE 2 — Criar todo o banco

1. No projeto do Supabase, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra, no computador, o arquivo:

   `supabase/01_RECRIAR_BANCO.sql`

4. Copie todo o conteúdo.
5. Cole no SQL Editor.
6. Clique em **Run**.
7. O resultado final deve mostrar:

   `Kanban Quest instalado com sucesso.`

O script cria estas tabelas:

- `profiles`
- `projects`
- `cards`
- `card_participants`
- `messages`
- `notification_reads`

Também cria:

- exclusão em cascata para projetos, cards e participantes;
- RLS para proteger os dados por usuário;
- busca de perfis pelo nome/e-mail;
- criação automática do perfil depois do login Google;
- índices para melhorar as consultas;
- proteção para impedir que um participante altere campos exclusivos do dono;
- estado online das notificações lidas.

## Conferir a instalação

1. Abra outro **New query** no SQL Editor.
2. Copie o conteúdo de `supabase/02_VERIFICAR_INSTALACAO.sql`.
3. Clique em **Run**.
4. Confirme:
   - seis tabelas listadas;
   - `rls_ativo = true` em todas;
   - várias políticas RLS;
   - funções como `search_profiles` e `is_card_participant`.

---

# PARTE 3 — Copiar URL e chave do Supabase

1. No Supabase, abra o painel **Connect** ou **Project Settings > API Keys**.
2. Copie:
   - **Project URL**;
   - **Publishable key**.
3. Abra o arquivo `config.js`.
4. Substitua somente os textos entre aspas:

```javascript
window.KANBAN_CONFIG = Object.freeze({
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_SUA_CHAVE"
});
```

5. Salve o arquivo.

## Segurança da chave

A **Publishable key** foi criada para uso no navegador e pode aparecer no frontend quando o RLS está corretamente habilitado.

Nunca coloque no site:

- `Secret key`;
- `service_role`;
- senha do banco.

---

# PARTE 4 — Configurar as URLs do login

No Supabase:

1. Abra **Authentication > URL Configuration**.
2. Em **Site URL**, coloque a URL final do GitHub Pages.

Para o repositório usado anteriormente, provavelmente será:

`https://ricardobmuller.github.io/Kanban_Thizza/`

3. Em **Redirect URLs**, adicione a mesma URL:

`https://ricardobmuller.github.io/Kanban_Thizza/`

4. Para testar localmente no VS Code com Live Server, também pode adicionar:

- `http://127.0.0.1:5500/**`
- `http://localhost:5500/**`

Se o nome do seu repositório for outro, troque `Kanban_Thizza` pelo nome correto. A URL diferencia letras maiúsculas e minúsculas.

---

# PARTE 5 — Configurar o login com Google

## 5.1 No Supabase

1. Abra **Authentication > Sign In / Providers**.
2. Selecione **Google**.
3. Deixe essa tela aberta.
4. Copie a **Callback URL** mostrada pelo Supabase. Ela terá este formato:

`https://SEU-PROJECT-REF.supabase.co/auth/v1/callback`

## 5.2 No Google Cloud

1. Entre em `https://console.cloud.google.com/`.
2. Crie um projeto ou selecione um existente.
3. Abra **Google Auth Platform**.
4. Configure **Branding**:
   - nome do aplicativo: `Kanban Quest`;
   - e-mail de suporte;
   - dados básicos solicitados.
5. Em **Audience**, use **External** para contas Google comuns.
6. Enquanto o aplicativo estiver em teste, adicione em **Test users** as contas que poderão entrar.
7. Em **Data Access**, confirme os escopos básicos:
   - `openid`;
   - e-mail do usuário;
   - perfil do usuário.
8. Abra **Clients** e crie um cliente OAuth.
9. Escolha **Web application**.
10. Em **Authorized JavaScript origins**, adicione apenas a origem, sem a pasta do repositório:

`https://ricardobmuller.github.io`

Para desenvolvimento local, adicione também:

- `http://127.0.0.1:5500`
- `http://localhost:5500`

11. Em **Authorized redirect URIs**, cole a Callback URL copiada do Supabase:

`https://SEU-PROJECT-REF.supabase.co/auth/v1/callback`

12. Crie o cliente.
13. Copie o **Client ID** e o **Client Secret**.

## 5.3 Voltar ao Supabase

1. Volte para **Authentication > Providers > Google**.
2. Ative o Google.
3. Cole:
   - Client ID;
   - Client Secret.
4. Salve.

> O Client Secret do Google fica somente no Supabase. Ele nunca deve ser colocado em `config.js`.

---

# PARTE 6 — Subir no GitHub Pages

## Atualizando o repositório existente

1. Extraia este ZIP.
2. Abra o repositório `Kanban_Thizza` no GitHub.
3. Substitua os arquivos antigos pelos arquivos deste pacote.
4. Confirme que `index.html`, `styles.css`, `app.js` e `config.js` estão na raiz do repositório, e não dentro de uma segunda pasta.
5. Faça o commit.

## Ativar o GitHub Pages

1. No repositório, abra **Settings**.
2. Abra **Pages**.
3. Em **Build and deployment**, escolha:
   - **Source:** `Deploy from a branch`;
   - **Branch:** `main`;
   - **Folder:** `/(root)`.
4. Clique em **Save**.
5. Aguarde alguns minutos.
6. Abra a URL exibida pelo GitHub Pages.
7. Pressione `Ctrl + F5` para garantir que o navegador não está usando arquivos antigos em cache.

---

# PARTE 7 — Ordem correta de testes

Faça os testes nesta ordem:

1. Abrir o site.
2. Clicar em **Entrar com Google**.
3. Confirmar que nome e foto aparecem.
4. Abrir **Perfil**, preencher dados e salvar.
5. Criar um projeto.
6. Recarregar a página e confirmar que o projeto continua disponível.
7. Criar um card com título e descrição.
8. Editar o card.
9. Adicionar checklist e comentário.
10. Mover o card entre colunas.
11. Excluir o card.
12. Recarregar a página e confirmar que ele não reaparece.
13. Excluir um projeto de teste.

## Teste de participantes

Para um usuário aparecer na busca de participantes, essa pessoa precisa:

1. abrir o Kanban Quest;
2. entrar com Google pelo menos uma vez.

O primeiro login cria automaticamente o registro na tabela `profiles`.

Depois disso:

1. entre com a conta dona do projeto;
2. crie ou edite um card;
3. pesquise o nome/e-mail da segunda conta;
4. clique em **Adicionar**;
5. salve o card;
6. entre com a segunda conta;
7. abra **Compartilhados comigo**.

O participante pode:

- visualizar o card;
- editar título e descrição;
- marcar checklist;
- adicionar comentários;
- mover o card entre colunas.

O participante não pode:

- excluir o card;
- mudar prazo, responsável, tags ou participantes;
- excluir o projeto.

---

# PARTE 8 — Correções incluídas nesta versão

- O card agora é excluído diretamente no Supabase e os participantes são apagados por relacionamento `ON DELETE CASCADE`.
- A exclusão confirma se uma linha realmente foi removida; caso contrário, mostra o motivo.
- A ordenação dos cards envia linhas completas ao banco. A versão anterior fazia um `upsert` parcial, que poderia falhar por causa de colunas obrigatórias.
- O modal do card não fecha mais ao clicar fora dele.
- A tecla `Esc` não fecha o modal durante o preenchimento.
- Ao tentar fechar pelo botão, o sistema avisa quando existem alterações não salvas.
- O botão de salvar é bloqueado durante a operação para impedir cliques duplicados.
- Em caso de falha, o estado visual é restaurado.
- Busca de participantes usa a função segura `search_profiles`.
- Projetos, cards, participantes, mensagens e notificações ficam online no Supabase.
- Não há armazenamento local de projetos/cards. O Supabase mantém apenas a sessão de autenticação no navegador para que o usuário continue conectado após recarregar a página.

---

# PARTE 9 — Erros comuns

## “Preencha a Project URL e a Publishable key”

O arquivo `config.js` ainda contém os textos `COLE_AQUI...` ou foi publicado em uma pasta diferente da raiz.

## Login volta para uma página errada

Confira a **Site URL** e a lista de **Redirect URLs** no Supabase. A URL precisa ser idêntica à do GitHub Pages e deve incluir a pasta do repositório e a barra final.

## Google mostra `redirect_uri_mismatch`

No Google Cloud, a URL autorizada deve ser a Callback URL do Supabase, não a URL do GitHub Pages:

`https://SEU-PROJECT-REF.supabase.co/auth/v1/callback`

## Usuário não aparece como participante

A segunda pessoa ainda não entrou no site com Google. Peça que ela faça o primeiro login.

## `new row violates row-level security policy`

Execute novamente o arquivo `01_RECRIAR_BANCO.sql` somente se o banco puder ser apagado. Depois execute o verificador. Confirme também que o site usa a Publishable key do mesmo projeto Supabase em que o SQL foi executado.

## Card não exclui

Confira:

- se você está logado com a conta que criou o card;
- se `cards_delete_owner` aparece no verificador;
- se o navegador não está usando uma versão antiga de `app.js` (`Ctrl + F5`).

## O site funciona localmente, mas não no GitHub Pages

Verifique se os quatro arquivos principais estão na raiz:

- `index.html`
- `styles.css`
- `app.js`
- `config.js`

---

# Fontes oficiais úteis

- Supabase — Google login: `https://supabase.com/docs/guides/auth/social-login/auth-google`
- Supabase — Redirect URLs: `https://supabase.com/docs/guides/auth/redirect-urls`
- Supabase — API keys: `https://supabase.com/docs/guides/getting-started/api-keys`
- Supabase — Row Level Security: `https://supabase.com/docs/guides/database/postgres/row-level-security`
- GitHub Pages — fonte de publicação: `https://docs.github.com/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site`
