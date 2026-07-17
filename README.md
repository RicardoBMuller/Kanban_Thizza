<div align="center">

# 🗂️ Kanban Quest

### Gestão visual de projetos com colaboração em tempo real

Uma aplicação Kanban moderna, colaborativa e totalmente online, desenvolvida com **JavaScript**, **Supabase** e **GitHub Pages**.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)

### 🚀 [Acessar demonstração online](https://ricardobmuller.github.io/Kanban_Thizza/)

</div>

---

## 📌 Sobre o projeto

O **Kanban Quest** é uma plataforma de organização de atividades inspirada em ferramentas como Trello, criada para facilitar o acompanhamento de projetos, tarefas e equipes.

Todo o conteúdo operacional é armazenado online no Supabase. Projetos, cards, comentários, checklists, participantes, mensagens, notificações e anexos ficam sincronizados no banco de dados, sem depender de armazenamento local para os dados do Kanban.

A interface utiliza um tema escuro com cards em cinza e destaque salmão para cards reabertos, mantendo legibilidade, contraste e identidade visual consistente.

> Este é um projeto independente e demonstrativo, com interface adaptada para um contexto institucional.

---

## ✨ Principais funcionalidades

### Organização de projetos

- Criação, edição e exclusão de projetos.
- Quadro dividido em **Pendente**, **Em Progresso** e **Concluído**.
- Movimentação de cards por arrastar e soltar.
- Pesquisa por título, descrição, labels, comentários e anexos.
- Dashboard com total de cards, concluídos, atrasados e percentual do checklist.

### Cards completos

- Título, descrição, responsável, prazo e labels.
- Descrição com parágrafos e formatação preservados na visualização externa.
- Checklist com acompanhamento de progresso.
- Comentários com data, autor e formatação rica.
- Participantes com nome, e-mail, avatar e data de inclusão.
- Avatar do responsável sempre visível, mesmo quando ele é o único integrante.
- Upload e consulta de documentos vinculados ao card.

### Editor de texto rico

O editor de descrições e comentários possui recursos semelhantes aos de um editor de e-mail:

- negrito, itálico, sublinhado e tachado;
- títulos, parágrafos, fontes e tamanhos;
- cores de texto e marca-texto;
- alinhamento e recuo;
- listas numeradas e com marcadores;
- links, citações e blocos de código;
- subscrito e sobrescrito;
- linha horizontal;
- emoticons;
- desfazer, refazer e limpar formatação.

### Colaboração online

- Login com conta Google.
- Compartilhamento de cards com usuários cadastrados.
- Área exclusiva de **Cards compartilhados comigo**.
- Permissões diferentes para responsável e participantes.
- Chat entre usuários.
- Notificações persistentes e atualização em tempo real.

### Fluxo de conclusão e reabertura

- Confirmação antes de concluir um card.
- Card concluído fica travado para alterações.
- Participantes recebem uma notificação de conclusão.
- Opção de reabrir o card mediante confirmação.
- Participantes recebem uma nova notificação na reabertura.
- Cards reabertos recebem faixa de destaque, marca d’água e identificação visual salmão.

### Segurança e armazenamento

- Row Level Security — RLS — ativo no Supabase.
- Regras de acesso aplicadas diretamente no banco.
- Anexos armazenados em bucket privado.
- Links temporários para consulta dos documentos.
- Exclusão em cascata dos dados relacionados ao card.
- Conteúdo formatado higienizado antes da exibição.

---

## 🧰 Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| HTML5 | Estrutura da aplicação |
| CSS3 | Interface, responsividade, animações e identidade visual |
| JavaScript | Regras de negócio e interações |
| Supabase Auth | Autenticação com Google |
| Supabase Database | Persistência online em PostgreSQL |
| Supabase Realtime | Atualização de notificações e dados compartilhados |
| Supabase Storage | Armazenamento privado de anexos |
| GitHub Pages | Hospedagem do frontend |

A aplicação é estática no frontend e não necessita de Node.js ou processo de build para ser publicada.

---

## 🗃️ Estrutura do projeto

```text
Kanban_Thizza/
├── index.html
├── styles.css
├── app.js
├── config.js
├── .nojekyll
├── README.md
└── supabase/
    ├── 01_RECRIAR_BANCO.sql
    ├── 02_VERIFICAR_INSTALACAO.sql
    ├── 03_BACKUP_E_RECUPERACAO.md
    ├── 04_ATUALIZAR_CONCLUSAO_REABERTURA.sql
    └── 05_ADICIONAR_AVATARES_E_ANEXOS.sql
```

---

## ⚙️ Como executar localmente

### 1. Clone o repositório

```bash
git clone https://github.com/ricardobmuller/Kanban_Thizza.git
cd Kanban_Thizza
```

### 2. Configure o Supabase

Abra o arquivo `config.js` e informe a URL e a chave pública do seu projeto:

```javascript
window.KANBAN_CONFIG = Object.freeze({
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "SUA_PUBLISHABLE_KEY"
});
```

A `Publishable key` pode ser utilizada no frontend quando as políticas RLS estão configuradas corretamente.

> Nunca publique a senha do banco, uma Secret key ou a chave `service_role`.

### 3. Inicie um servidor local

Com Python instalado:

```bash
python -m http.server 5500
```

Depois, acesse:

```text
http://localhost:5500
```

O uso de um servidor local é recomendado porque autenticação, módulos externos e redirecionamentos podem não funcionar corretamente abrindo o `index.html` diretamente pelo Explorador de Arquivos.

---

## 🗄️ Preparação do Supabase

### Instalação nova

No **SQL Editor** do Supabase, execute:

```text
supabase/01_RECRIAR_BANCO.sql
```

Esse script cria as tabelas, funções, gatilhos, índices, políticas RLS e recursos necessários para o funcionamento do projeto.

Depois, execute:

```text
supabase/02_VERIFICAR_INSTALACAO.sql
```

### Banco já existente

Para atualizar uma estrutura anterior sem recriar todos os dados, utilize as migrações correspondentes:

```text
supabase/04_ATUALIZAR_CONCLUSAO_REABERTURA.sql
supabase/05_ADICIONAR_AVATARES_E_ANEXOS.sql
```

Leia os comentários presentes nos arquivos SQL antes da execução.

---

## 🔐 Login com Google

Para habilitar o login:

1. Crie um cliente OAuth 2.0 do tipo **Aplicativo da Web** no Google Cloud.
2. Adicione a origem autorizada do site:

```text
https://ricardobmuller.github.io
```

3. Adicione como URI de redirecionamento a Callback URL informada pelo Supabase:

```text
https://SEU-PROJETO.supabase.co/auth/v1/callback
```

4. Informe o Client ID e o Client Secret em:

```text
Supabase → Authentication → Sign In / Providers → Google
```

5. Em **URL Configuration**, configure a URL publicada no GitHub Pages.

---

## 🌐 Publicação no GitHub Pages

1. Envie os arquivos para a branch `main`.
2. Abra **Settings → Pages** no repositório.
3. Em **Build and deployment**, selecione:
   - Source: `Deploy from a branch`;
   - Branch: `main`;
   - Folder: `/ (root)`.
4. Salve e aguarde o deploy.

Endereço atual do projeto:

```text
https://ricardobmuller.github.io/Kanban_Thizza/
```

---

## 🔒 Boas práticas

- Não envie credenciais privadas para o GitHub.
- Mantenha as políticas RLS ativadas.
- Não utilize `service_role` no navegador.
- Antes de alterações estruturais no banco, faça um backup.
- Teste migrations em um projeto de homologação sempre que possível.
- Revogue e substitua imediatamente qualquer credencial exposta.

---

## 👨‍💻 Autor

Desenvolvido por **Ricardo Santos**.

- GitHub: [@ricardobmuller](https://github.com/ricardobmuller)
- Aplicação: [Kanban Quest](https://ricardobmuller.github.io/Kanban_Thizza/)

---

<div align="center">

Feito com organização, colaboração e muitas melhorias contínuas. 🚀

</div>
