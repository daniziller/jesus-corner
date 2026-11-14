-- Jesus' Corner — ordem livre e ponto de partida do plano (ajustes da aba
-- Planos, 2026-11-14): a leitura contínua da Bíblia ganha uma quarta
-- ordem, "livre", e o ponto de partida deixa de marcar capítulos como
-- lidos — passa a ser só um ponteiro de onde o plano segue.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Só acrescenta: nenhuma
-- linha existente muda.

-- A ordem da leitura contínua aceita 'free' (ordem livre): o plano segue
-- do último texto que a pessoa abriu na leitura do plano. A regra antiga
-- (0058) só aceitava as três primeiras.
alter table public.user_data
  drop constraint if exists user_data_bible_order_mode_check;
alter table public.user_data
  add constraint user_data_bible_order_mode_check
  check (bible_order_mode in ('canonical', 'chronological', 'custom', 'free'));

-- De onde o plano segue — { "start": { "book", "chapter" } | null,
-- "free": { "book", "chapter" } | null }. `start` é o ponto de partida
-- escolhido nas ordens canônica, cronológica e minha ordem; `free`, onde a
-- pessoa está na ordem livre. Nulo = do começo da fila. Nenhum dos dois
-- marca nada como lido (ver src/reading/bibleOrderMath.js).
-- custom_book_order (0058) passa a guardar só os livros que fazem parte do
-- plano em "minha ordem" — mesmo formato, uma lista de nomes de livro.
alter table public.user_data
  add column if not exists reading_plan_position jsonb;
