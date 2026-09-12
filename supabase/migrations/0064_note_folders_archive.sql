-- Jesus' Corner — pastas e arquivo na Biblioteca (aba Notas), pedido dela
-- (2026-09-12): "deletar nota" (ícone de lixo, já existia por trás de um
-- botão dentro da edição — isso é só UI nova, sem coluna nova) e "arquivar
-- nota", com pastas criadas pela própria pessoa.
--
-- Mesmo padrão de sermon_notes (0039) e outras colunas de user_data:
-- arrays jsonb, um por usuário, sem tabela relacional nova.
--
-- note_folders: [{ id, name, createdAt }]
-- archived_notes: [{ noteKey, folderId (null = "Sem pasta"/arquivo geral),
--                     archivedAt }]
--   noteKey é a MESMA `key` que a Biblioteca já usa pra identificar cada
--   item na lista (chave de notesStore, id de marcação, id de anotação de
--   sermão etc. — ver NotesScreen.jsx) — arquivar é uma camada por cima,
--   sem mexer em nenhuma das stores de origem (não apaga/move a anotação
--   de verdade, só marca "arquivada" e some da lista principal).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists note_folders jsonb not null default '[]'::jsonb;

alter table public.user_data
  add column if not exists archived_notes jsonb not null default '[]'::jsonb;
