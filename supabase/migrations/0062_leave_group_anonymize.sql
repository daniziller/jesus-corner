-- Jesus' Corner — "Sair do grupo" passa a tornar anônimas todas as
-- mensagens da pessoa NAQUELE grupo (pedido dela, 2026-09-10).
--
-- "Mensagem", pro propósito desta leva, é o mesmo union de três fontes
-- que já define a caixa de mensagens unificada (0057_group_messages.sql,
-- comentário no topo do arquivo):
--   - sala de capítulo  → group_chapter_posts (0045)
--   - discussão geral   → group_comments (0002)
--   - pedido de oração  → group_prayer_requests, só scope='group' (0052)
--
-- group_prayer_requests JÁ tem uma coluna `anonymous` (0052, "aparece
-- como 'Anônimo' pra quem vê") — só falta usá-la aqui. As outras duas
-- tabelas nunca tiveram essa coluna; ganham agora.
--
-- leave_group_and_anonymize substitui o DELETE direto que o client fazia
-- em reading_group_members (groupsStore.js/leaveGroup) — tudo numa
-- transação só (security definer), pra nunca ficar "saiu, mas as
-- mensagens continuam com nome" nem o contrário. A pessoa só pode
-- anonimizar as PRÓPRIAS linhas (auth.uid() em cada UPDATE) mesmo
-- rodando com privilégio elevado.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.group_chapter_posts add column if not exists anonymous boolean not null default false;
alter table public.group_comments add column if not exists anonymous boolean not null default false;

create or replace function public.leave_group_and_anonymize(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid() and status = 'joined'
  ) then
    raise exception 'not_a_member';
  end if;

  update public.group_chapter_posts
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid();

  update public.group_comments
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid();

  update public.group_prayer_requests
    set anonymous = true
    where group_id = target_group_id and user_id = auth.uid() and scope = 'group';

  delete from public.reading_group_members
    where group_id = target_group_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_group_and_anonymize(uuid) to authenticated;

-- get_group_messages (0057) hardcodava is_anonymous=false pras origens
-- 'sala_capitulo' e 'geral' — só 'pedido_oracao' já olhava a coluna
-- (group_prayer_requests.anonymous já existia desde 0052). Agora que
-- group_chapter_posts/group_comments também têm a coluna, a caixa de
-- mensagens unificada (33b) precisa da MESMA função de novo, só
-- trocando esses dois `false` fixos por coalesce(...anonymous, false)
-- — senão alguém que saiu de um grupo continuaria aparecendo com nome
-- de verdade pra quem lê a caixa de mensagens, mesmo com o post/
-- comentário já marcado anonymous=true nas tabelas de origem.
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
      coalesce(p.anonymous, false) as is_anonymous,
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
      coalesce(c.anonymous, false),
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
