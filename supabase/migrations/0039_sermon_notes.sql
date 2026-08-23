-- Jesus' Corner — anotações de sermão (aba Notas).
--
-- Registro de sermões ouvidos na igreja — preletor, igreja, um ou mais
-- textos bíblicos lidos/citados (com faixa de versículos opcional) e o
-- corpo livre da anotação. Data gravada automaticamente na criação. Ver
-- src/notes/sermonNotesStore.js.
--
-- Formato: array de anotações —
-- [{ id, date, createdAt, updatedAt, preacher, church,
--    passages: [{ book, chapter, verseStart, verseEnd }],
--    text }]
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists sermon_notes jsonb not null default '[]'::jsonb;
