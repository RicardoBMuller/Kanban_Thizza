# Kanban Quest — Owner sempre visível e card reaberto neutro

Esta versão mantém o visual escuro original aprovado e incorpora os ajustes solicitados.

## Alterações

- O avatar do responsável pelo card aparece sempre, mesmo quando ele é a única pessoa vinculada.
- O responsável aparece primeiro na pilha de avatares fora do card.
- Dentro do card, o responsável é exibido com avatar, nome, e-mail e selo **Responsável**.
- Em cards compartilhados, o perfil e o avatar do dono são carregados online pela tabela `profiles` do Supabase.
- Os números das colunas **Pendente**, **Em Progresso** e **Concluído** usam texto branco sobre a bolinha vinho.
- Cards reabertos têm a mesma cor dos cards normais.
- A identificação de reabertura continua visível por meio da faixa vermelha, badge, data e marca d’água **REABERTO**.
- Avatares de participantes, anexos online, notificações e bloqueio de cards concluídos permanecem ativos.

## Supabase

Esta atualização **não exige um novo SQL**.

Caso você já tenha executado anteriormente:

```text
supabase/05_ADICIONAR_AVATARES_E_ANEXOS.sql
```

não precisa executar nada no banco.

O pacote mantém os arquivos SQL completos apenas para reinstalação ou para outro ambiente que ainda não possua anexos e Storage configurados.

> Não execute `01_RECRIAR_BANCO.sql` no banco atual. Esse arquivo apaga e recria a estrutura do projeto.

## Preserve o config.js atual

O `config.js` incluído no pacote contém campos de exemplo. Mantenha o arquivo que já funciona no seu GitHub Pages, com a Project URL e a Publishable key corretas.

Nunca coloque `service_role`, Secret key ou senha do banco no frontend.

## Publicação no GitHub Pages

Substitua na raiz do repositório:

```text
index.html
styles.css
app.js
.nojekyll
```

Mantenha o seu `config.js` atual. Depois do deploy, abra o site e pressione `Ctrl + F5` para limpar o cache.

## Estrutura do pacote

```text
index.html
styles.css
app.js
config.js
.nojekyll
LEIA-ME_PRIMEIRO.md
ATENCAO_ANTES_DE_PUBLICAR.txt
VERSAO_E_ALTERACOES.txt
supabase/
```

---

## Atualização visual — cards rosa em gradiente

Esta versão utiliza as duas cores da referência fornecida:

- **Card reaberto:** base `#E3868F`, com gradiente rosa mais intenso.
- **Card normal:** base `#FFD4D5`, com gradiente rosa claro.

Os fundos possuem transparência moderada e os textos brancos receberam contorno preto mínimo para melhorar a leitura. A faixa vermelha e a marca d'água continuam exclusivas dos cards reabertos.

Esta atualização não exige nenhuma alteração no Supabase.
