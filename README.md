<div align="center">

# 🗂️ Kanban Quest

### Gestão visual de projetos com colaboração online

Uma aplicação Kanban moderna, responsiva e colaborativa, desenvolvida para organizar projetos, tarefas, participantes e fluxos de trabalho em uma interface inspirada em ferramentas como Trello.

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)

### 🚀 [Acessar demonstração online](https://ricardobmuller.github.io/Kanban_Thizza/)

</div>

---

## 📌 Sobre o projeto

O **Kanban Quest** é uma plataforma de gestão visual de atividades criada para facilitar o acompanhamento de projetos, tarefas e equipes.

A aplicação permite organizar cards por etapas, compartilhar atividades com outros usuários, acompanhar prazos, checklists, comentários, anexos e notificações em um ambiente totalmente online.

O projeto utiliza uma interface escura, responsiva e orientada à produtividade, com diferenciação visual para cards normais, concluídos e reabertos.

---

## ✨ Principais recursos

- Criação e gerenciamento de projetos.
- Quadro Kanban com colunas de status.
- Movimentação de cards por arrastar e soltar.
- Cards com descrição, prazo, etiquetas e responsável.
- Participantes com avatar.
- Checklist com acompanhamento de progresso.
- Comentários com editor de texto rico.
- Upload e consulta de documentos.
- Cards compartilhados entre usuários.
- Notificações de conclusão e reabertura.
- Bloqueio automático de cards concluídos.
- Reabertura com destaque visual e histórico.
- Pesquisa por conteúdo dos cards.
- Dashboard com indicadores do projeto.
- Interface adaptada para desktop e dispositivos móveis.

---

## 🛠️ Tecnologias utilizadas

### Frontend

- **HTML5** para a estrutura da aplicação.
- **CSS3** para layout, responsividade, animações e identidade visual.
- **JavaScript Vanilla** para a lógica da interface e integração com os serviços online.
- **Drag and Drop API** para movimentação dos cards entre colunas.
- **ContentEditable** para o editor de texto rico das descrições e comentários.

### Backend e dados

- **Supabase** como plataforma de backend.
- **PostgreSQL** para persistência dos dados.
- **Supabase Auth** para autenticação.
- **Google OAuth 2.0** para login com conta Google.
- **Supabase Realtime** para notificações e atualizações online.
- **Supabase Storage** para armazenamento de anexos.

### Hospedagem

- **GitHub Pages** para publicação do frontend.
- Arquitetura estática no cliente, sem necessidade de servidor próprio para hospedar a interface.

---

## 🧩 Arquitetura

O projeto utiliza uma arquitetura frontend-first:

```text
Navegador
   │
   ├── Interface HTML, CSS e JavaScript
   │
   ├── Autenticação com Google
   │
   └── Integração com Supabase
         ├── Banco PostgreSQL
         ├── Realtime
         └── Storage
```

A interface é executada diretamente no navegador, enquanto autenticação, persistência, colaboração e arquivos são processados pela infraestrutura do Supabase.

---

## 🎨 Interface

A experiência visual foi desenvolvida com foco em:

- legibilidade;
- navegação intuitiva;
- organização semelhante a ferramentas Kanban conhecidas;
- feedback visual em ações importantes;
- diferenciação entre cards normais, concluídos e reabertos;
- compatibilidade com diferentes tamanhos de tela.

---

## 📂 Estrutura principal

```text
Kanban_Quest/
├── index.html
├── styles.css
├── app.js
├── config.js
├── .nojekyll
└── README.md
```

---

## 🚀 Execução

O projeto pode ser executado diretamente no navegador por meio de um servidor web local, como o **Live Server** do Visual Studio Code.

A versão publicada está disponível em:

**https://ricardobmuller.github.io/Kanban_Thizza/**

---

## 📱 Responsividade

A interface foi desenvolvida para funcionar em computadores, notebooks, tablets e smartphones.

Os quadros, cards, menus e modais se reorganizam conforme o tamanho da tela.

---

## 👨‍💻 Autor

Desenvolvido por **Ricardo Santos**.

- GitHub: [@ricardobmuller](https://github.com/ricardobmuller)
- Projeto online: [Kanban Quest](https://ricardobmuller.github.io/Kanban_Thizza/)

---

<div align="center">

Projeto desenvolvido com foco em organização, colaboração e experiência do usuário. 🚀

</div>
