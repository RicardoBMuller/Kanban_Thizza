# Kanban Quest — Avatares e Anexos Online

Esta versão mantém o visual escuro original aprovado e acrescenta:

- avatares dos participantes na parte externa dos cards, em formato empilhado como no Trello;
- avatares, nome, e-mail e data de inclusão na área interna do card;
- documentos anexados e armazenados online no Supabase Storage;
- visualização e download dos anexos por link temporário e seguro;
- envio de anexos pelo dono e pelos participantes enquanto o card estiver aberto;
- card concluído continua travado e permite apenas visualizar/baixar anexos;
- cards normais ficaram ligeiramente mais claros que os cards reabertos.

## 1. Atualize o Supabase antes de publicar

No Supabase:

1. Abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/05_ADICIONAR_AVATARES_E_ANEXOS.sql` deste pacote.
4. Copie todo o conteúdo, cole no SQL Editor e clique em **Run**.

Resultado esperado:

```text
Atualização concluída sem apagar dados.
```

O script cria:

- a coluna `attachments` na tabela `cards`;
- o bucket privado `card-attachments`;
- políticas de segurança para donos e participantes;
- limite de 15 MB por arquivo.

O script não apaga projetos, cards, comentários, checklists ou participantes.

## 2. Verifique a instalação

Execute o arquivo:

```text
supabase/02_VERIFICAR_INSTALACAO.sql
```

No resumo final, o esperado é:

- `tabelas_encontradas`: 7
- `tabelas_com_rls`: 7
- `funcoes_encontradas`: 9
- `campos_card_encontrados`: 7
- `realtime_notificacoes`: 1
- `bucket_anexos`: 1
- `politicas_storage`: 3

## 3. Preserve o config.js atual

O `config.js` deste pacote contém campos de exemplo. Mantenha o arquivo que já funciona no seu GitHub Pages, com a Project URL e a Publishable key corretas.

Nunca coloque `service_role`, Secret key ou senha do banco no frontend.

## 4. Publique no GitHub Pages

Envie estes arquivos para a raiz do repositório:

```text
index.html
styles.css
app.js
config.js
.nojekyll
```

Depois do deploy, abra o site e pressione `Ctrl + F5`.

## Formatos aceitos

PDF, Word, Excel, PowerPoint, TXT, CSV, JPG, PNG, WEBP e ZIP. O limite é de 15 MB por arquivo e até 8 arquivos por seleção.
