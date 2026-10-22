-- Pedido dela (2026-10-19): "quantas pessoas oraram pelo pedido" tem que
-- contar POR PESSOA, nunca por dia. pray_count já era count(distinct
-- user_id) desde a migration 0059 — o servidor sempre esteve certo. O bug
-- real é no CLIENTE: toda tela que marca "orei por isso" (handlePray/
-- handleSuplicaPray em PrayerScreen.jsx, PrayerRequestsScreen.jsx,
-- PrayerRequestDetailScreen.jsx, GroupsScreen.jsx) soma +1 no optimistic
-- update TODA vez que a marca é feita, sem saber se esta pessoa já tinha
-- contado num dia anterior — "orei ontem" soma 1, "orei hoje" (dia novo,
-- o botão reaparece) soma +1 de novo, mesma pessoa virando 2 na tela até
-- a próxima recarga do servidor corrigir.
--
-- Pra o cliente conseguir decidir quando NÃO somar (já contei essa pessoa
-- antes, em qualquer dia — não é "orei hoje", que reseta toda meia-noite),
-- get_supplication_requests e get_prayer_requests_feed ganham
-- already_prayed_ever (existe uma marca de qualquer dia, não só hoje).
-- get_my_prayer_requests não precisa — já devolve days_prayed (> 0 serve
-- de "already prayed ever" ali).

drop function if exists public.get_supplication_requests(int);

create or replace function public.get_supplication_requests(max_n int default 3)
returns table (
  id uuid, body text, anonymous boolean, author_id uuid, author_name text,
  scope text, group_id uuid, group_name text, created_at timestamptz,
  pray_count bigint, already_prayed boolean, already_prayed_ever boolean
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
    ),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid()
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

drop function if exists public.get_prayer_requests_feed(uuid, int);

create or replace function public.get_prayer_requests_feed(target_group_id uuid default null, max_n int default 50)
returns table (
  id uuid, body text, anonymous boolean, author_id uuid, author_name text, is_mine boolean,
  scope text, group_id uuid, group_name text, status text, created_at timestamptz,
  pray_count bigint, already_prayed boolean, already_prayed_ever boolean
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
    ),
    exists (
      select 1 from public.group_prayer_intentions gi
      where gi.prayer_request_id = r.id and gi.user_id = auth.uid()
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
