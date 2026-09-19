-- Jesus' Corner — comentários em pedidos de oração (pedido dela,
-- 2026-09-19).
--
-- Reverte de propósito uma decisão de design anterior: a migration 0052
-- tinha removido group_prayer_comments/group_prayer_comment_likes do
-- banco porque "o design novo PROÍBE comentário em pedido de oração —
-- ninguém pode comentar, só orar". Ela pediu de volta, depois de eu
-- confirmar que isso reverte aquela regra: agora QUALQUER pedido pode
-- receber comentário de QUALQUER pessoa que já pode VER aquele pedido —
-- a mesma visibilidade de sempre (autor, membro do mesmo grupo se
-- scope='group', ou amigo do autor se scope='friends'; 'only_me' só o
-- próprio autor, já que mais ninguém enxerga o pedido). O botão "Orei
-- por isso" continua existindo do lado do comentário, não no lugar dele.
--
-- O AUTOR do comentário aparece sempre com nome — mesmo se o PEDIDO for
-- anônimo (a anonimidade é do pedido, não vira anonimidade de quem
-- comenta nele; decisão minha, avisada a ela).
--
-- Apagar: quem escreveu o comentário, ou — só quando o pedido é de um
-- grupo — o moderador daquele grupo. Mesmo critério do mural de
-- discussão do grupo (0002: "autor ou moderador apaga comentario").
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e
-- rode. Idempotente. Pressupõe 0002, 0006 e 0052 já rodados (usa
-- is_group_member/is_group_moderator/is_friend_with).


-- ═══════════════════════════════════════════════════════════════
-- 1. TABELA
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.group_prayer_comments (
  id uuid primary key default gen_random_uuid(),
  prayer_request_id uuid not null references public.group_prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists group_prayer_comments_request_idx
  on public.group_prayer_comments (prayer_request_id, created_at);

alter table public.group_prayer_comments enable row level security;


-- ═══════════════════════════════════════════════════════════════
-- 2. HELPER — "posso ver esse pedido?" (mesma regra da policy de SELECT
--    de group_prayer_requests, ver 0052 — reaproveitada aqui em função
--    pra não duplicar a lógica em cada policy/RPC de comentário)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.can_see_prayer_request(target_request_id uuid, viewer_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_prayer_requests r
    where r.id = target_request_id
      and (
        r.user_id = viewer_id
        or (r.scope = 'group' and public.is_group_member(r.group_id, viewer_id))
        or (r.scope = 'friends' and public.is_friend_with(r.user_id, viewer_id))
      )
  );
$$;

grant execute on function public.can_see_prayer_request(uuid, uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 3. POLICIES — group_prayer_comments
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "comentarios visiveis a quem ve o pedido" on public.group_prayer_comments;
create policy "comentarios visiveis a quem ve o pedido" on public.group_prayer_comments
  for select
  using (public.can_see_prayer_request(prayer_request_id));

drop policy if exists "quem ve o pedido pode comentar" on public.group_prayer_comments;
create policy "quem ve o pedido pode comentar" on public.group_prayer_comments
  for insert
  with check (auth.uid() = user_id and public.can_see_prayer_request(prayer_request_id));

drop policy if exists "autor ou moderador do grupo apaga comentario" on public.group_prayer_comments;
create policy "autor ou moderador do grupo apaga comentario" on public.group_prayer_comments
  for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_comments.prayer_request_id
        and r.scope = 'group'
        and public.is_group_moderator(r.group_id)
    )
  );


-- ═══════════════════════════════════════════════════════════════
-- 4. RPC — ler os comentários de um pedido, com o nome do autor.
--    security definer só pra poder trazer profiles.name mesmo quando o
--    autor do comentário não é visível pra quem lê via a policy normal
--    de profiles (ex: dois amigos do mesmo autor, num pedido scope
--    'friends', não necessariamente são amigos ENTRE si) — por isso
--    revalida can_see_prayer_request aqui dentro: função security
--    definer ignora RLS na sua própria consulta, então a checagem de
--    visibilidade do PEDIDO precisa ficar explícita no corpo, não só na
--    policy de SELECT (que essa função nem passa por).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.get_prayer_request_comments(target_request_id uuid)
returns table (
  id uuid,
  body text,
  user_id uuid,
  author_name text,
  created_at timestamptz,
  is_mine boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.body, c.user_id, p.name, c.created_at, c.user_id = auth.uid()
  from public.group_prayer_comments c
  join public.profiles p on p.user_id = c.user_id
  where c.prayer_request_id = target_request_id
    and public.can_see_prayer_request(target_request_id)
  order by c.created_at asc;
$$;

grant execute on function public.get_prayer_request_comments(uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 5. get_my_prayer_requests ganha comment_count — muda a lista de
--    colunas de retorno, então precisa de DROP antes do CREATE (Postgres
--    não deixa CREATE OR REPLACE mudar o formato de saída de uma função
--    existente).
-- ═══════════════════════════════════════════════════════════════

drop function if exists public.get_my_prayer_requests(int);

create or replace function public.get_my_prayer_requests(max_n int default 100)
returns table (
  id uuid,
  body text,
  scope text,
  group_id uuid,
  group_name text,
  is_mine boolean,
  status text,
  resposta text,
  nota_resposta text,
  created_at timestamptz,
  respondido_em timestamptz,
  pray_count bigint,
  days_prayed bigint,
  already_prayed_today boolean,
  comment_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id, r.body, r.scope, r.group_id, g.name,
    r.user_id = auth.uid(),
    r.status, r.resposta, r.nota_resposta,
    r.created_at, r.respondido_em,
    coalesce(cnt.people, 0),
    coalesce(cnt.mine_days, 0),
    coalesce(cnt.prayed_today, false),
    coalesce(cc.n, 0)
  from public.group_prayer_requests r
  left join public.reading_groups g on g.id = r.group_id
  left join lateral (
    select
      count(distinct gi.user_id) as people,
      count(distinct gi.prayed_date) filter (where gi.user_id = auth.uid()) as mine_days,
      bool_or(gi.prayed_date = current_date and gi.user_id = auth.uid()) as prayed_today
    from public.group_prayer_intentions gi
    where gi.prayer_request_id = r.id
  ) cnt on true
  left join lateral (
    select count(*) as n from public.group_prayer_comments gc where gc.prayer_request_id = r.id
  ) cc on true
  where
    r.user_id = auth.uid()
    or (r.status = 'open' and r.scope = 'group' and public.is_group_member(r.group_id))
  order by (r.status = 'open') desc, r.created_at desc
  limit max_n;
$$;

grant execute on function public.get_my_prayer_requests(int) to authenticated;
