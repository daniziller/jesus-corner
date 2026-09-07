-- Jesus' Corner — caixa de mensagens da Comunidade (quadros 33a/33b, ver
-- handoff-comunidade-33/HANDOFF-33a-33b-comunidade.md, seção "Dados que
-- precisam existir"). Uma mensagem, pro propósito desta caixa, é qualquer
-- evento de UM DOS TRÊS tipos que já existem em tabelas próprias — não
-- duplicamos o conteúdo numa tabela "group_messages" física, unificamos
-- via RPC (union), pra não ter duas fontes de verdade pro mesmo texto:
--   - sala de capítulo  → group_chapter_posts (0045)
--   - pedido de oração  → group_prayer_requests, só scope='group' (0006/0052)
--   - geral (discussão) → group_comments (0002)
--
-- O que É novo de verdade:
--   - reading_group_members.muted — silenciar grupo é por pessoa, não
--     existia nenhum jeito de marcar isso ainda; a coluna existe aqui,
--     mas 33a/33b não trazem tela pra ligá-la — fica sempre falsa (nenhum
--     grupo silenciado) até uma leva futura dar um controle pra isso.
--     Documentado, não fingido: as duas telas já respeitam a coluna.
--   - message_reads — 1 linha por (usuário, grupo): até quando esse par
--     já foi "visto". "Marcar lidas" (33b) sobe esse ponteiro pra agora
--     em TODOS os grupos de uma vez — não existe cursor por tipo de
--     mensagem, um só por grupo mesmo.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.reading_group_members add column if not exists muted boolean not null default false;

create table if not exists public.message_reads (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  last_read_at timestamptz not null default '1970-01-01'::timestamptz,
  primary key (user_id, group_id)
);
alter table public.message_reads enable row level security;

drop policy if exists "cada um só mexe nas próprias leituras" on public.message_reads;
create policy "cada um só mexe nas próprias leituras" on public.message_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Resumo por grupo (33a: badge por linha em "Seus grupos" + soma pro sino
-- do cabeçalho, junto com pedidos de amizade — ver get_pending_friend_
-- requests_count em friendsStore.js, contado à parte no cliente).
-- total_count alimenta "Grupo Semente · 34 mensagens" no arquivo (33b),
-- sem precisar de uma segunda chamada.
create or replace function public.get_group_messages_summary()
returns table (group_id uuid, group_name text, unread_count integer, total_count integer)
language sql
security definer
stable
set search_path = public
as $$
  with my_groups as (
    select m.group_id, coalesce(mr.last_read_at, '1970-01-01'::timestamptz) as since
    from public.reading_group_members m
    left join public.message_reads mr on mr.group_id = m.group_id and mr.user_id = auth.uid()
    where m.user_id = auth.uid() and m.status = 'joined' and not m.muted
  )
  select
    g.group_id,
    rg.name,
    (
      (select count(*)::int from public.group_chapter_posts p where p.group_id = g.group_id and p.user_id <> auth.uid() and p.created_at > g.since)
      + (select count(*)::int from public.group_prayer_requests r where r.group_id = g.group_id and r.scope = 'group' and r.user_id <> auth.uid() and r.created_at > g.since)
      + (select count(*)::int from public.group_comments c where c.group_id = g.group_id and c.user_id <> auth.uid() and c.created_at > g.since)
    ) as unread_count,
    (
      (select count(*)::int from public.group_chapter_posts p where p.group_id = g.group_id and p.user_id <> auth.uid())
      + (select count(*)::int from public.group_prayer_requests r where r.group_id = g.group_id and r.scope = 'group' and r.user_id <> auth.uid())
      + (select count(*)::int from public.group_comments c where c.group_id = g.group_id and c.user_id <> auth.uid())
    ) as total_count
  from my_groups g
  join public.reading_groups rg on rg.id = g.group_id;
$$;

-- Lista unificada (33b) — as três origens, mais recentes primeiro, não
-- lidas antes das lidas. "locked" (só existe pra sala de capítulo) é o
-- mesmo espírito de has_completed_chapter em group_chapter_room_stats
-- (0045): quem ainda não leu aquele capítulo não vê o corpo da mensagem
-- aqui (evita spoiler no meio da caixa de notificação) — body vem null
-- e o cliente mostra "Leia {book} {chapter} para entrar" no lugar,
-- exatamente como o próprio handoff descreve pro toque na linha.
-- Pedido de oração anônimo (scope='group', anonymous=true) preserva o
-- anonimato aqui também: author_id/name/avatar vêm null, cliente mostra
-- "Anônimo" — mesma garantia que a Súplica (25a) já dá em outro lugar.
-- context_book/context_chapter (em vez de um texto já formatado) — o nome
-- do livro em pt sozinho não serve pra montar "sala de Gênesis 41" numa
-- conta em inglês; deixa o cliente montar a frase com o mesmo bookLabel()
-- que o resto do app já usa pra isso.
create or replace function public.get_group_messages(max_n integer default 100)
returns table (
  id uuid, kind text, group_id uuid, group_name text,
  author_id uuid, author_name text, author_avatar_url text,
  body text, context_book text, context_chapter integer, created_at timestamptz,
  is_read boolean, locked boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with my_groups as (
    select m.group_id, coalesce(mr.last_read_at, '1970-01-01'::timestamptz) as since
    from public.reading_group_members m
    left join public.message_reads mr on mr.group_id = m.group_id and mr.user_id = auth.uid()
    where m.user_id = auth.uid() and m.status = 'joined' and not m.muted
  ),
  unioned as (
    select
      p.id, 'sala_capitulo'::text as kind, p.group_id, p.user_id as author_id,
      false as is_anonymous,
      case when public.has_completed_chapter(p.book, p.chapter) then p.body else null end as body,
      p.book as context_book, p.chapter as context_chapter,
      p.created_at,
      not public.has_completed_chapter(p.book, p.chapter) as locked
    from public.group_chapter_posts p
    join my_groups g on g.group_id = p.group_id
    where p.user_id <> auth.uid()

    union all

    select
      r.id, 'pedido_oracao'::text, r.group_id, r.user_id,
      coalesce(r.anonymous, false),
      r.body, null::text, null::integer, r.created_at, false
    from public.group_prayer_requests r
    join my_groups g on g.group_id = r.group_id
    where r.scope = 'group' and r.user_id <> auth.uid()

    union all

    select
      c.id, 'geral'::text, c.group_id, c.user_id,
      false,
      c.body, null::text, null::integer, c.created_at, false
    from public.group_comments c
    join my_groups g on g.group_id = c.group_id
    where c.user_id <> auth.uid()
  )
  select
    u.id, u.kind, u.group_id, rg.name,
    case when u.is_anonymous then null else u.author_id end,
    case when u.is_anonymous then null else pr.name end,
    case when u.is_anonymous then null else pr.avatar_url end,
    u.body, u.context_book, u.context_chapter, u.created_at,
    (u.created_at <= g.since) as is_read,
    u.locked
  from unioned u
  join my_groups g on g.group_id = u.group_id
  join public.reading_groups rg on rg.id = u.group_id
  left join public.profiles pr on pr.user_id = u.author_id
  order by (u.created_at <= g.since) asc, u.created_at desc
  limit max_n;
$$;

-- "Marcar lidas" (33b) — sobe last_read_at pra agora em TODOS os grupos
-- de uma vez, zerando o badge inteiro sem abrir nada, como o quadro pede.
create or replace function public.mark_group_messages_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.message_reads (user_id, group_id, last_read_at)
  select auth.uid(), m.group_id, now()
  from public.reading_group_members m
  where m.user_id = auth.uid() and m.status = 'joined'
  on conflict (user_id, group_id) do update set last_read_at = excluded.last_read_at;
end;
$$;
