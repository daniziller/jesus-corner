-- Jesus' Corner — pedidos de oração na identidade nova (25a/25b, Bloco 11).
--
-- Mudança de modelo: o pedido deixa de ser só de GRUPO (group_id
-- obrigatório) e ganha ESCOPO — 'group' (um grupo específico, como antes),
-- 'friends' (todos os seus amigos aceitos) ou 'only_me' (só você — vira um
-- lembrete privado que volta na Súplica dos próximos dias). Ganha também
-- `anonymous` (aparece como "Anônimo" pra quem vê) e `status`
-- ('open'/'closed', encerramento pelo autor).
--
-- Mudança de comportamento, não só de dado: o design novo PROÍBE
-- comentário em pedido de oração ("Ninguém pode comentar — só orar") e
-- proíbe que QUALQUER pessoa (inclusive o autor) veja QUEM orou por um
-- pedido — só o número. Por isso:
--   1. group_prayer_comments e group_prayer_comment_likes saem do banco
--      nesta migration — se já existir algum comentário real em produção,
--      ele é perdido. Proposital (o produto não tem mais onde mostrar
--      isso), mas avise antes de rodar se isso importa pra alguém.
--   2. A policy de SELECT de group_prayer_intentions, que antes deixava
--      qualquer membro do grupo ver QUEM marcou "orando por isso" em cada
--      pedido, vira "só vejo minha própria linha" — a contagem pública
--      passa a vir só de get_supplication_requests/get_prayer_requests_feed
--      abaixo (security definer, conta sem expor as linhas).
--
-- Nome da tabela mantido (group_prayer_requests) apesar de nem todo pedido
-- ser mais de grupo — evita renomear em cascata no client por um ganho
-- só cosmético; o comentário deste arquivo é a documentação real.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente), exceto pela perda de
-- comentários já mencionada acima (isso só acontece de verdade uma vez).
-- Pressupõe 0002 (friendships/is_group_member) e 0006 (as tabelas de
-- pedido) já rodados.


-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNAS NOVAS
-- ═══════════════════════════════════════════════════════════════

alter table public.group_prayer_requests
  alter column group_id drop not null;

alter table public.group_prayer_requests
  add column if not exists scope text not null default 'group',
  add column if not exists anonymous boolean not null default false,
  add column if not exists status text not null default 'open';

alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_scope_check,
  add constraint group_prayer_requests_scope_check check (scope in ('group', 'friends', 'only_me'));

alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_status_check,
  add constraint group_prayer_requests_status_check check (status in ('open', 'closed'));

alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_group_scope_check,
  add constraint group_prayer_requests_group_scope_check
    check ((scope = 'group' and group_id is not null) or (scope <> 'group' and group_id is null));

-- Tamanho real do campo (25b mostra contador "63 / 240") — o check
-- original (0006) já garantia 1 a 2000; isto só aperta o teto sem mexer
-- no nome/constraint antigo.
alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_body_len_check,
  add constraint group_prayer_requests_body_len_check check (char_length(body) <= 240);


-- ═══════════════════════════════════════════════════════════════
-- 2. COMENTÁRIOS SAEM DO BANCO (design novo não permite mais)
-- ═══════════════════════════════════════════════════════════════

drop table if exists public.group_prayer_comment_likes;
drop table if exists public.group_prayer_comments;


-- ═══════════════════════════════════════════════════════════════
-- 3. FUNÇÃO AUXILIAR — "somos amigos aceitos?" (pro escopo 'friends')
-- ═══════════════════════════════════════════════════════════════

create or replace function public.is_friend_with(target_user_id uuid, viewer_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and (
        (requester_id = viewer_id and addressee_id = target_user_id)
        or (requester_id = target_user_id and addressee_id = viewer_id)
      )
  );
$$;

grant execute on function public.is_friend_with(uuid, uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 4. POLICIES — group_prayer_requests (SELECT/INSERT/DELETE pelo escopo)
-- ═══════════════════════════════════════════════════════════════

drop policy if exists "pedidos visiveis a membros do grupo" on public.group_prayer_requests;
create policy "pedidos visiveis pelo escopo" on public.group_prayer_requests
  for select
  using (
    auth.uid() = user_id
    or (scope = 'group' and public.is_group_member(group_id))
    or (scope = 'friends' and public.is_friend_with(user_id))
  );

drop policy if exists "membro posta pedido de oracao" on public.group_prayer_requests;
create policy "postar pedido de oracao" on public.group_prayer_requests
  for insert
  with check (
    auth.uid() = user_id
    and (
      (scope = 'group' and group_id is not null and public.is_group_member(group_id))
      or (scope in ('friends', 'only_me') and group_id is null)
    )
  );

-- Encerrar (status -> 'closed') passa pela RPC close_prayer_request
-- abaixo, não por UPDATE direto do client — mais fácil garantir que só o
-- status muda, e só o autor mexe nele.
drop policy if exists "autor ou moderador apaga pedido" on public.group_prayer_requests;
create policy "autor ou moderador apaga pedido" on public.group_prayer_requests
  for delete
  using (
    auth.uid() = user_id
    or (group_id is not null and public.is_group_moderator(group_id))
  );


-- ═══════════════════════════════════════════════════════════════
-- 5. POLICIES — group_prayer_intentions ("orei"): contagem sem identidade
-- ═══════════════════════════════════════════════════════════════

-- Antes: qualquer membro do grupo via TODAS as linhas (quem orou). Agora:
-- cada um só vê a PRÓPRIA marcação (pra saber se já orou) — a contagem
-- pública vem de get_supplication_requests/get_prayer_requests_feed.
drop policy if exists "intencoes visiveis pro grupo" on public.group_prayer_intentions;
create policy "so vejo minha propria intencao" on public.group_prayer_intentions
  for select using (auth.uid() = user_id);

-- Marcar "orei" exige que o pedido esteja aberto, visível pelo escopo
-- (grupo/amigos) e não seja seu próprio — orar pelo PRÓPRIO pedido não
-- faz sentido, e 'only_me' nunca é visível a mais ninguém de qualquer
-- forma (a subconsulta abaixo já respeita a RLS de group_prayer_requests).
drop policy if exists "marcar e so meu" on public.group_prayer_intentions;
create policy "marcar e so meu" on public.group_prayer_intentions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_intentions.prayer_request_id
        and r.status = 'open'
        and r.user_id <> auth.uid()
        and (
          (r.scope = 'group' and public.is_group_member(r.group_id))
          or (r.scope = 'friends' and public.is_friend_with(r.user_id))
        )
    )
  );

drop policy if exists "desmarcar e so meu" on public.group_prayer_intentions;
create policy "desmarcar e so meu" on public.group_prayer_intentions
  for delete using (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════
-- 6. ENCERRAR UM PEDIDO — só o autor, só o campo status
-- ═══════════════════════════════════════════════════════════════

create or replace function public.close_prayer_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.group_prayer_requests
  set status = 'closed'
  where id = target_request_id and user_id = auth.uid();
  if not found then
    raise exception 'not_found_or_not_owner';
  end if;
end;
$$;

grant execute on function public.close_prayer_request(uuid) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 7. LEITURA — duas RPCs security definer, nenhuma expõe quem orou
-- ═══════════════════════════════════════════════════════════════

-- Súplica (25a): até `max_n` pedidos de OUTRAS pessoas esperando oração —
-- os seus 'only_me' também aparecem aqui pra você mesmo (é o "volta na
-- Súplica dos próximos dias" do mockup), mas nunca os que você postou pra
-- grupo/amigos (orar pelo próprio pedido público não faz sentido).
-- Ordenado por quem tem MENOS oração recebida primeiro.
create or replace function public.get_supplication_requests(max_n int default 3)
returns table (
  id uuid,
  body text,
  anonymous boolean,
  author_id uuid,
  author_name text,
  scope text,
  group_id uuid,
  group_name text,
  created_at timestamptz,
  pray_count bigint,
  already_prayed boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id, r.body, r.anonymous,
    r.user_id,
    case when r.anonymous then null else p.name end,
    r.scope, r.group_id, g.name,
    r.created_at,
    coalesce(cnt.n, 0),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid()
    )
  from public.group_prayer_requests r
  join public.profiles p on p.user_id = r.user_id
  left join public.reading_groups g on g.id = r.group_id
  left join lateral (
    select count(*) as n from public.group_prayer_intentions gi2
    where gi2.prayer_request_id = r.id
  ) cnt on true
  where r.status = 'open'
    and (
      (r.scope = 'only_me' and r.user_id = auth.uid())
      or (r.scope = 'group' and r.user_id <> auth.uid() and public.is_group_member(r.group_id))
      or (r.scope = 'friends' and r.user_id <> auth.uid() and public.is_friend_with(r.user_id))
    )
  order by cnt.n asc, r.created_at asc
  limit max_n;
$$;

grant execute on function public.get_supplication_requests(int) to authenticated;

-- Lista completa ("Ver todos", 25a, e a aba de oração de um grupo
-- específico): todos os pedidos abertos visíveis a você — os seus de
-- qualquer escopo (pra gerenciar/encerrar) + os de grupo/amigos de outras
-- pessoas. `target_group_id` filtra pra um grupo só (aba do grupo);
-- null = tudo (lista da Comunidade). Mais recente primeiro.
create or replace function public.get_prayer_requests_feed(target_group_id uuid default null, max_n int default 50)
returns table (
  id uuid,
  body text,
  anonymous boolean,
  author_id uuid,
  author_name text,
  is_mine boolean,
  scope text,
  group_id uuid,
  group_name text,
  status text,
  created_at timestamptz,
  pray_count bigint,
  already_prayed boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    r.id, r.body, r.anonymous,
    r.user_id,
    case when r.anonymous and r.user_id <> auth.uid() then null else p.name end,
    r.user_id = auth.uid(),
    r.scope, r.group_id, g.name,
    r.status,
    r.created_at,
    coalesce(cnt.n, 0),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid()
    )
  from public.group_prayer_requests r
  join public.profiles p on p.user_id = r.user_id
  left join public.reading_groups g on g.id = r.group_id
  left join lateral (
    select count(*) as n from public.group_prayer_intentions gi2
    where gi2.prayer_request_id = r.id
  ) cnt on true
  where r.status = 'open'
    and (target_group_id is null or r.group_id = target_group_id)
    and (
      r.user_id = auth.uid()
      or (r.scope = 'group' and public.is_group_member(r.group_id))
      or (r.scope = 'friends' and public.is_friend_with(r.user_id))
    )
  order by r.created_at desc
  limit max_n;
$$;

grant execute on function public.get_prayer_requests_feed(uuid, int) to authenticated;
