-- Jesus' Corner — cache de verdade pro "Contexto antes do capítulo"
-- (turno 35, tela 10c) e pro botão novo "Relembre onde a história parou"
-- (turno 39, follow-up). Antes disso o cache era só o CDN da Vercel
-- (Cache-Control s-maxage=2592000) — expira em 30 dias e não é
-- consultável. Esta tabela substitui isso: gera uma vez por capítulo
-- (igual pra todo mundo, sem nada específico de usuário — mesmo texto
-- bíblico que já é público), nunca mais chama a IA de novo pro mesmo
-- capítulo+idioma, e fica pra sempre (sem TTL).
--
-- Leitura pública (o próprio conteúdo, sem nada sensível, já era exposto
-- sem autenticação em api/generate-chapter-context.js); escrita só pela
-- service role (a function usa supabaseAdmin, nunca o client do
-- navegador grava aqui).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.chapter_contexts (
  id uuid primary key default gen_random_uuid(),
  -- Mesmo nome de livro usado em completed_keys (ver src/data/bibleBlocks.js).
  book text not null,
  chapter integer not null check (chapter > 0),
  lang text not null check (lang in ('pt', 'en')),
  -- { recap, whoAppears, chapterThread, watchFor: string[3] } — ver
  -- ChapterContextSchema em api/_lib/ai.js.
  context jsonb not null,
  created_at timestamptz not null default now(),
  unique (book, chapter, lang)
);

alter table public.chapter_contexts enable row level security;

create policy "contexto de capitulo e publico" on public.chapter_contexts
  for select using (true);

-- Sem policy de insert/update/delete: só a service role (que ignora RLS)
-- grava aqui, dentro de api/generate-chapter-context.js.
