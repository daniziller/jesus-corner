-- Jesus' Corner — turnos 36-37, Bloco 2 (36d/36e): ciclo de resposta dos
-- pedidos de oração ("Como Deus respondeu?") + "Orei por isso" virar marca
-- POR DIA (não mais toggle por clique).
--
-- Reaproveita group_prayer_requests/group_prayer_intentions (0006/0052) em
-- vez de criar tabelas paralelas — o pedido "grupo" que aparece em 36d é o
-- MESMO pedido que já aparece na aba de oração de um grupo (Comunidade,
-- GroupsScreen.jsx): um pedido só, duas telas.
--
-- Mudanças de comportamento (decidido com a Daniela, não só de dado):
--   1. "Orei por isso" deixa de ser toggle (marca/desmarca) em TODO lugar
--      que usa group_prayer_intentions, inclusive a Comunidade — agora só
--      MARCA (insert), uma vez por dia por pessoa; repetir no mesmo dia
--      não faz nada, e ninguém "desmarca" mais que orou.
--   2. Marcar "orei" no PRÓPRIO pedido passa a ser permitido (antes era
--      bloqueado — "orar pelo próprio pedido não faz sentido"). O 36d
--      precisa disso pra "orando há N dias" no que a própria pessoa
--      escreveu (scope only_me/friends/group, tanto faz).
--   3. `origem` do 36d (meu | grupo) NÃO é uma coluna nova — é "eu
--      escrevi" (is_mine) vs "vi de alguém do meu grupo": calculado no
--      client a partir de is_mine, o `scope` interno do pedido continua
--      existindo só para a visibilidade (quem vê o quê).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente. Pressupõe 0006 e 0052 já rodados.


-- ═══════════════════════════════════════════════════════════════
-- 1. group_prayer_requests — colunas do ciclo de resposta (36e)
-- ═══════════════════════════════════════════════════════════════

alter table public.group_prayer_requests
  add column if not exists resposta text,
  add column if not exists nota_resposta text,
  add column if not exists respondido_em timestamptz;

alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_resposta_check,
  add constraint group_prayer_requests_resposta_check
    check (resposta is null or resposta in ('sim', 'nao', 'espere', 'aprenda', 'se_mova'));

alter table public.group_prayer_requests
  drop constraint if exists group_prayer_requests_nota_resposta_len_check,
  add constraint group_prayer_requests_nota_resposta_len_check
    check (nota_resposta is null or char_length(nota_resposta) <= 240);


-- ═══════════════════════════════════════════════════════════════
-- 2. group_prayer_intentions — "orei" vira marca por DIA, não por clique
-- ═══════════════════════════════════════════════════════════════

alter table public.group_prayer_intentions
  add column if not exists prayed_date date not null default (current_date);

alter table public.group_prayer_intentions
  drop constraint if exists group_prayer_intentions_pkey,
  add primary key (prayer_request_id, user_id, prayed_date);

-- Marcar exige o pedido aberto e visível (grupo/amigos/o seu próprio) —
-- agora inclui o PRÓPRIO pedido (antes era só o de outra pessoa).
drop policy if exists "marcar e so meu" on public.group_prayer_intentions;
create policy "marcar e so meu" on public.group_prayer_intentions
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.group_prayer_requests r
      where r.id = group_prayer_intentions.prayer_request_id
        and r.status = 'open'
        and (
          r.user_id = auth.uid()
          or (r.scope = 'group' and public.is_group_member(r.group_id))
          or (r.scope = 'friends' and public.is_friend_with(r.user_id))
        )
    )
  );

-- "desmarcar e so meu" (delete) fica como está — o client não chama mais
-- (marcar virou insert-only em todo lugar), mas não custa manter pra
-- quem precisar corrigir dado direto no banco.


-- ═══════════════════════════════════════════════════════════════
-- 3. ARQUIVAR com resposta (36e) — só o autor
-- ═══════════════════════════════════════════════════════════════

-- "Espere" nunca chama esta função (devolve pro Ativos sem mexer em nada
-- — ver prayerRequestsStore.js); as outras quatro respostas arquivam.
create or replace function public.archive_prayer_request(target_request_id uuid, response text, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if response not in ('sim', 'nao', 'aprenda', 'se_mova') then
    raise exception 'invalid_response';
  end if;
  update public.group_prayer_requests
  set status = 'closed', resposta = response, nota_resposta = nullif(trim(note), ''), respondido_em = now()
  where id = target_request_id and user_id = auth.uid();
  if not found then
    raise exception 'not_found_or_not_owner';
  end if;
end;
$$;

grant execute on function public.archive_prayer_request(uuid, text, text) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 4. LEITURA — feed próprio do 36d (meus pedidos + os do meu grupo)
-- ═══════════════════════════════════════════════════════════════

-- Diferente de get_prayer_requests_feed (25a/Comunidade, só 'open'): aqui
-- entram também os SEUS 'closed' (seção Respondidos, 36d) — o pedido de
-- outro membro do grupo só entra enquanto 'open' (uma vez arquivado pelo
-- autor, some da sua lista — a nota/resposta é dele, não sua).
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
  already_prayed_today boolean
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
    coalesce(cnt.prayed_today, false)
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
  where
    r.user_id = auth.uid()
    or (r.status = 'open' and r.scope = 'group' and public.is_group_member(r.group_id))
  order by (r.status = 'open') desc, r.created_at desc
  limit max_n;
$$;

grant execute on function public.get_my_prayer_requests(int) to authenticated;


-- ═══════════════════════════════════════════════════════════════
-- 5. get_prayer_requests_feed / get_supplication_requests — pray_count
--    agora conta PESSOAS distintas (a marca virou por dia, não por linha
--    única), e already_prayed vira "já orei HOJE" (o botão da Comunidade
--    também reacende no dia seguinte, em vez de ficar marcado pra sempre).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.get_supplication_requests(max_n int default 3)
returns table (
  id uuid, body text, anonymous boolean, author_id uuid, author_name text,
  scope text, group_id uuid, group_name text, created_at timestamptz,
  pray_count bigint, already_prayed boolean
)
language sql security definer stable set search_path = public
as $$
  select
    r.id, r.body, r.anonymous, r.user_id,
    case when r.anonymous then null else p.name end,
    r.scope, r.group_id, g.name, r.created_at,
    coalesce(cnt.n, 0),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid() and gi.prayed_date = current_date
    )
  from public.group_prayer_requests r
  join public.profiles p on p.user_id = r.user_id
  left join public.reading_groups g on g.id = r.group_id
  left join lateral (
    select count(distinct gi2.user_id) as n from public.group_prayer_intentions gi2
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

create or replace function public.get_prayer_requests_feed(target_group_id uuid default null, max_n int default 50)
returns table (
  id uuid, body text, anonymous boolean, author_id uuid, author_name text, is_mine boolean,
  scope text, group_id uuid, group_name text, status text, created_at timestamptz,
  pray_count bigint, already_prayed boolean
)
language sql security definer stable set search_path = public
as $$
  select
    r.id, r.body, r.anonymous, r.user_id,
    case when r.anonymous and r.user_id <> auth.uid() then null else p.name end,
    r.user_id = auth.uid(),
    r.scope, r.group_id, g.name, r.status, r.created_at,
    coalesce(cnt.n, 0),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid() and gi.prayed_date = current_date
    )
  from public.group_prayer_requests r
  join public.profiles p on p.user_id = r.user_id
  left join public.reading_groups g on g.id = r.group_id
  left join lateral (
    select count(distinct gi2.user_id) as n from public.group_prayer_intentions gi2
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
