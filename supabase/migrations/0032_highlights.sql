-- Jesus' Corner — marcações de trechos específicos (versículo a versículo)
-- durante a leitura, com nota própria — mais fina que a anotação por
-- sessão/passagem já existente (ver notes jsonb, src/notes/notesStore.js).
--
-- Formato de highlights: um array de marcações —
-- [{ id, book, bookEn, chapter, verses: [9,10,11], text, createdAt, date,
--    sessionMode: 'session'|'browse' }]
-- `date` = dateKey() local no momento da criação; `sessionMode` indica se
-- foi feita durante uma sessão guiada da Rotina ou navegação livre pela
-- Bíblia — usado só pra decidir o que aparece na aba Reflexão do dia (ver
-- ReflectionScreen.jsx).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists highlights jsonb not null default '[]'::jsonb;
