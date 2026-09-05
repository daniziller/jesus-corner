-- Jesus' Corner — leitura social (redesign Bento, quadros 17a/17b/17c).
--
-- 17a Sala do capítulo: uma sala por capítulo dentro de cada grupo, aberta
--     só para quem já concluiu o capítulo (a policy de SELECT das respostas
--     checa completed_keys de quem lê — quem não leu vê só a contagem
--     "7 de 12 concluíram", via RPC). Pergunta da semana vem de um
--     moderador do grupo (humano). Reação única: "Amém".
-- 17c Camada do grupo na leitura: contagem de quem marcou cada versículo
--     (RPC sobre user_data.highlights dos colegas de grupo); nomes e notas
--     só de quem tem perfil público (profiles.is_public).
-- 17b Retrospectiva do mês: snapshots mensais dos totais, guardados na
--     própria linha de dados (user_data.monthly_snapshots), pra calcular o
--     que subiu de um mês pro outro.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

-- ── 17b ─────────────────────────────────────────────────────────────
alter table public.user_data
  add column if not exists monthly_snapshots jsonb not null default '{}'::jsonb;

-- ── 17a: tabelas ───────────────────────────────────────────────────
create table if not exists public.group_chapter_questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  -- Mesmo nome de livro usado em completed_keys (ver src/data/bibleBlocks.js).
  book text not null,
  chapter integer not null check (chapter > 0),
  author_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, book, chapter)
);

create table if not exists public.group_chapter_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  -- Citação opcional de um versículo do capítulo (texto + referência curta).
  quote_text text,
  quote_ref text,
  created_at timestamptz not null default now()
);

create index if not exists group_chapter_posts_room_idx
  on public.group_chapter_posts (group_id, book, chapter, created_at);

create table if not exists public.group_post_amens (
  post_id uuid not null references public.group_chapter_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.group_chapter_questions enable row level security;
alter table public.group_chapter_posts enable row level security;
alter table public.group_post_amens enable row level security;

-- "Já concluí este capítulo?" — checa completed_keys de quem chama. Security
-- definer porque user_data só é visível pro próprio dono; aqui a pergunta é
-- sempre sobre auth.uid(), então não vaza nada de ninguém.
create or replace function public.has_completed_chapter(target_book text, target_chapter integer)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.user_data
    where user_id = auth.uid()
      and completed_keys @> array[target_book || ':' || target_chapter::text]
  );
$$;

-- Pergunta da semana: visível pro grupo; só moderador escreve/edita/apaga.
drop policy if exists "pergunta visivel pro grupo" on public.group_chapter_questions;
create policy "pergunta visivel pro grupo" on public.group_chapter_questions
  for select using (public.is_group_member(group_id));
drop policy if exists "moderador escreve a pergunta" on public.group_chapter_questions;
create policy "moderador escreve a pergunta" on public.group_chapter_questions
  for insert with check (auth.uid() = author_id and public.is_group_moderator(group_id));
drop policy if exists "moderador edita a pergunta" on public.group_chapter_questions;
create policy "moderador edita a pergunta" on public.group_chapter_questions
  for update using (public.is_group_moderator(group_id));
drop policy if exists "moderador apaga a pergunta" on public.group_chapter_questions;
create policy "moderador apaga a pergunta" on public.group_chapter_questions
  for delete using (public.is_group_moderator(group_id));

-- Respostas: só quem é do grupo E já concluiu o capítulo lê (sem spoiler);
-- postar exige o mesmo.
drop policy if exists "sala aberta so pra quem leu" on public.group_chapter_posts;
create policy "sala aberta so pra quem leu" on public.group_chapter_posts
  for select using (public.is_group_member(group_id) and public.has_completed_chapter(book, chapter));
drop policy if exists "quem leu responde" on public.group_chapter_posts;
create policy "quem leu responde" on public.group_chapter_posts
  for insert with check (auth.uid() = user_id and public.is_group_member(group_id) and public.has_completed_chapter(book, chapter));
drop policy if exists "autor ou moderador apaga resposta" on public.group_chapter_posts;
create policy "autor ou moderador apaga resposta" on public.group_chapter_posts
  for delete using (auth.uid() = user_id or public.is_group_moderator(group_id));

drop policy if exists "amens visiveis pra quem ve a resposta" on public.group_post_amens;
create policy "amens visiveis pra quem ve a resposta" on public.group_post_amens
  for select using (exists (select 1 from public.group_chapter_posts p where p.id = post_id));
drop policy if exists "amem e so meu" on public.group_post_amens;
create policy "amem e so meu" on public.group_post_amens
  for insert with check (auth.uid() = user_id and exists (select 1 from public.group_chapter_posts p where p.id = post_id));
drop policy if exists "tiro meu amem" on public.group_post_amens;
create policy "tiro meu amem" on public.group_post_amens
  for delete using (auth.uid() = user_id);

-- ── 17a: "N de M concluíram" ───────────────────────────────────────
-- Contagem de membros do grupo que já concluíram o capítulo. Security
-- definer pra ler completed_keys dos colegas — devolve só números, nunca
-- quem. Só responde a membros do grupo.
create or replace function public.group_chapter_room_stats(target_group_id uuid, target_book text, target_chapter integer)
returns table (members integer, completed integer, posts integer)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*)::int from public.reading_group_members m
      where m.group_id = target_group_id and m.status = 'joined'),
    (select count(*)::int from public.reading_group_members m
      join public.user_data d on d.user_id = m.user_id
      where m.group_id = target_group_id and m.status = 'joined'
        and d.completed_keys @> array[target_book || ':' || target_chapter::text]),
    (select count(*)::int from public.group_chapter_posts p
      where p.group_id = target_group_id and p.book = target_book and p.chapter = target_chapter)
  where public.is_group_member(target_group_id);
$$;

-- ── 17c: marcações do grupo por versículo ──────────────────────────
-- Para cada versículo do capítulo marcado por OUTROS membros do grupo:
-- quantos marcaram e, só de quem tem perfil público, nome e anotação.
-- Marcações escondidas (hidden) não contam.
create or replace function public.group_chapter_marks(target_group_id uuid, target_book text, target_chapter integer)
returns table (verse integer, marks integer, sharers jsonb)
language sql
security definer
stable
set search_path = public
as $$
  with hl as (
    select m.user_id, pr.name, pr.is_public,
           h.value as h
    from public.reading_group_members m
    join public.user_data d on d.user_id = m.user_id
    join public.profiles pr on pr.user_id = m.user_id
    cross join lateral jsonb_array_elements(coalesce(d.highlights, '[]'::jsonb)) as h(value)
    where m.group_id = target_group_id and m.status = 'joined'
      and m.user_id <> auth.uid()
      and public.is_group_member(target_group_id)
      and (h.value->>'book') = target_book
      and (h.value->>'chapter')::int = target_chapter
      and coalesce((h.value->>'hidden')::boolean, false) = false
  ),
  per_verse as (
    select (v.value)::int as verse, hl.user_id, hl.name, hl.is_public, hl.h->>'text' as note
    from hl cross join lateral jsonb_array_elements_text(coalesce(hl.h->'verses', '[]'::jsonb)) as v(value)
  )
  select verse,
         count(distinct user_id)::int as marks,
         coalesce(jsonb_agg(distinct jsonb_build_object('name', name, 'note', nullif(note, ''))) filter (where is_public), '[]'::jsonb) as sharers
  from per_verse
  group by verse
  order by verse;
$$;
