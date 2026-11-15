-- Varredura de segurança (2026-11-15). Sete portas fechadas, nenhuma muda
-- o que o app faz hoje: todas as chamadas do app continuam permitidas.
--
-- 1. upsert_subscription_from_stripe_event (0073) nascia executável por
--    qualquer um (no Postgres toda função nova vale pra PUBLIC; o
--    comentário de 0073 dizia "sem grant pra authenticated", mas faltava o
--    revoke). Com a chave pública do app dava pra se dar Premium + IA, ou
--    cancelar a assinatura de outra pessoa. Agora só o servidor (service
--    role, api/stripe-webhook.js) chama. De quebra, um evento que ENCERRA
--    uma assinatura (cancelada, incompleta, vencida...) só vale se for da
--    assinatura que a linha guarda hoje: na troca de plano o webhook
--    cancela a antiga depois de gravar a nova, e esse cancelamento (mais
--    novo) gravava "canceled" por cima — a pessoa pagava o plano novo e
--    ficava sem acesso. Vitalício nunca é tocado por evento de assinatura.
--
-- 2. Funções SECURITY DEFINER deixam de valer pra quem não tem conta
--    (anon). O app só chama funções depois do login; sem conta, várias
--    delas devolviam dado mesmo assim (find_user_by_email dizia se um
--    e-mail tem conta, com nome e id). Quem já podia (authenticated,
--    service_role) continua podendo. Funções de gatilho ficam como estão.
--
-- 3. friendships: o pedido de amizade só nasce "pendente" (dava pra gravar
--    uma amizade já aceita com qualquer pessoa e ler os pedidos de oração
--    "só amigos" dela), e quem aceita não pode trocar as pessoas da linha.
--
-- 4. group_chapter_marks: a nota de um versículo só aparece pro grupo se a
--    pessoa escolheu esse grupo em "Quem vê" (sharedGroupIds). Antes ia o
--    texto de toda marcação de quem tem perfil público, inclusive as notas
--    marcadas "Só eu".
--
-- 5. get_prayer_requests_feed: pedido anônimo não devolve mais o id de
--    quem escreveu (escondia só o nome).
--
-- 6. Fotos de perfil: sai a regra antiga "avatares publicamente legiveis"
--    (0004), que 0025 substituiu mas não removeu — as regras se somam, e
--    com ela qualquer um listava e baixava qualquer foto.
--
-- 7. Denúncias: report_group_message confere que a mensagem existe, é do
--    grupo e é de quem está sendo denunciado, e guarda o texto real dela
--    (não o que veio de quem denuncia). decide_group_message_report só
--    apaga mensagem do próprio grupo.

-- 1 ----------------------------------------------------------------------
create or replace function public.upsert_subscription_from_stripe_event(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_plan text,
  p_tier text,
  p_access_type text,
  p_amount_cents integer,
  p_currency text,
  p_current_period_end timestamptz,
  p_event_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, plan, tier,
    access_type, amount_cents, currency, current_period_end,
    billing_provider, stripe_event_at, updated_at
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_plan, p_tier,
    p_access_type, p_amount_cents, p_currency, p_current_period_end,
    'stripe', p_event_at, now()
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    plan = excluded.plan,
    tier = excluded.tier,
    access_type = excluded.access_type,
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    current_period_end = excluded.current_period_end,
    billing_provider = 'stripe',
    stripe_event_at = excluded.stripe_event_at,
    updated_at = now()
  where (public.subscriptions.stripe_event_at is null
         or public.subscriptions.stripe_event_at <= excluded.stripe_event_at)
    and public.subscriptions.access_type is distinct from 'lifetime'
    and (
      excluded.status in ('active', 'trialing', 'past_due')
      or (public.subscriptions.stripe_subscription_id = excluded.stripe_subscription_id
          and public.subscriptions.access_type = 'recurring'
          and coalesce(public.subscriptions.billing_provider, 'stripe') = 'stripe')
    );
end;
$$;

revoke execute on function public.upsert_subscription_from_stripe_event(uuid, text, text, text, text, text, text, integer, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.upsert_subscription_from_stripe_event(uuid, text, text, text, text, text, text, integer, text, timestamptz, timestamptz) to service_role;

-- 2 ----------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig,
           has_function_privilege('authenticated', p.oid, 'execute') as auth_ok
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    if f.auth_ok then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;

-- 3 ----------------------------------------------------------------------
drop policy if exists "so posso pedir amizade em meu nome" on public.friendships;
create policy "so posso pedir amizade em meu nome" on public.friendships
  for insert with check (auth.uid() = requester_id and status = 'pending');

create or replace function public.friendships_keep_pair()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id then
    raise exception 'Não dá pra trocar as pessoas de uma amizade.';
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_keep_pair on public.friendships;
create trigger friendships_keep_pair
  before update on public.friendships
  for each row execute function public.friendships_keep_pair();

-- 4 ----------------------------------------------------------------------
create or replace function public.group_chapter_marks(target_group_id uuid, target_book text, target_chapter integer)
returns table(verse integer, marks integer, sharers jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with hl as (
    select m.user_id, pr.name, pr.is_public, h.value as h
    from public.reading_group_members m
    join public.user_data d on d.user_id = m.user_id
    join public.profiles pr on pr.user_id = m.user_id
    cross join lateral jsonb_array_elements(coalesce(d.highlights, '[]'::jsonb)) as h(value)
    where m.group_id = target_group_id
      and m.status = 'joined'
      and m.user_id <> auth.uid()
      and public.is_group_member(target_group_id)
      and (h.value->>'book') = target_book
      and (h.value->>'chapter')::int = target_chapter
      and coalesce((h.value->>'hidden')::boolean, false) = false
  ),
  per_verse as (
    select (v.value)::int as verse, hl.user_id, hl.name, hl.is_public,
           case when coalesce(hl.h->'sharedGroupIds', '[]'::jsonb) ? target_group_id::text
                then hl.h->>'text' end as note
    from hl
    cross join lateral jsonb_array_elements_text(coalesce(hl.h->'verses', '[]'::jsonb)) as v(value)
  )
  select verse,
         count(distinct user_id)::int as marks,
         coalesce(jsonb_agg(distinct jsonb_build_object('name', name, 'note', nullif(note, ''))) filter (where is_public), '[]'::jsonb) as sharers
  from per_verse
  group by verse
  order by verse;
$$;

-- 5 ----------------------------------------------------------------------
create or replace function public.get_prayer_requests_feed(target_group_id uuid default null, max_n integer default 50)
returns table(id uuid, body text, anonymous boolean, author_id uuid, author_name text, is_mine boolean, scope text, group_id uuid, group_name text, status text, created_at timestamptz, pray_count bigint, already_prayed boolean, already_prayed_ever boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.body,
    r.anonymous,
    case when r.anonymous and r.user_id <> auth.uid() then null else r.user_id end,
    case when r.anonymous and r.user_id <> auth.uid() then null else p.name end,
    r.user_id = auth.uid(),
    r.scope,
    r.group_id,
    g.name,
    r.status,
    r.created_at,
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
    select count(distinct gi2.user_id) as n
    from public.group_prayer_intentions gi2
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

-- 6 ----------------------------------------------------------------------
drop policy if exists "avatares publicamente legiveis" on storage.objects;

-- 7 ----------------------------------------------------------------------
create or replace function public.report_group_message(
  target_group_id uuid,
  p_message_kind text,
  p_message_id uuid,
  p_reported_user_id uuid,
  p_message_snapshot text,
  p_reason text,
  p_reason_detail text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  real_author uuid;
  real_body text;
begin
  if not public.is_group_member(target_group_id) then
    raise exception 'Você precisa ser do grupo pra denunciar uma mensagem dele.';
  end if;
  if p_message_kind not in ('comment', 'chapter_post') then
    raise exception 'Tipo de mensagem inválido.';
  end if;
  if p_reason not in ('propaganda', 'cobranca', 'linguagem_agressiva', 'conteudo_improprio', 'outro') then
    raise exception 'Motivo inválido.';
  end if;

  if p_message_kind = 'comment' then
    select c.user_id, c.body into real_author, real_body
    from public.group_comments c
    where c.id = p_message_id and c.group_id = target_group_id;
  else
    select cp.user_id, cp.body into real_author, real_body
    from public.group_chapter_posts cp
    where cp.id = p_message_id and cp.group_id = target_group_id;
  end if;

  if real_author is null or real_author <> p_reported_user_id then
    raise exception 'Mensagem não encontrada neste grupo.';
  end if;
  if real_author = auth.uid() then
    raise exception 'Não dá pra denunciar a própria mensagem.';
  end if;

  -- p_message_snapshot fica na assinatura pra não quebrar o app, mas o que
  -- se guarda é o texto real da mensagem.
  insert into public.group_message_reports (
    group_id, message_kind, message_id, message_snapshot,
    reported_user_id, reporter_id, reason, reason_detail
  ) values (
    target_group_id, p_message_kind, p_message_id, real_body,
    real_author, auth.uid(), p_reason, nullif(trim(coalesce(p_reason_detail, '')), '')
  )
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.decide_group_message_report(target_report_id uuid, p_decision text, p_decision_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  notif_title text;
begin
  select * into r from public.group_message_reports where id = target_report_id;
  if r is null then
    raise exception 'Denúncia não encontrada.';
  end if;
  if r.status = 'resolved' then
    raise exception 'Esta denúncia já foi decidida.';
  end if;
  if not public.is_group_moderator(r.group_id) then
    raise exception 'Só um moderador do grupo pode decidir sobre esta denúncia.';
  end if;
  if p_decision not in ('deleted_message', 'muted_user', 'removed_member', 'kept_message') then
    raise exception 'Decisão inválida.';
  end if;
  if p_decision <> 'kept_message' and coalesce(trim(p_decision_reason), '') = '' then
    raise exception 'Motivo é obrigatório pra esta decisão.';
  end if;

  if p_decision = 'deleted_message' then
    if r.message_kind = 'comment' then
      delete from public.group_comments where id = r.message_id and group_id = r.group_id;
    else
      delete from public.group_chapter_posts where id = r.message_id and group_id = r.group_id;
    end if;
  elsif p_decision = 'muted_user' then
    update public.reading_group_members
      set silenced_until = now() + interval '7 days'
      where group_id = r.group_id and user_id = r.reported_user_id;
  elsif p_decision = 'removed_member' then
    perform public.remove_group_member(r.group_id, r.reported_user_id, p_decision_reason);
  end if;

  update public.group_message_reports
    set status = 'resolved',
        decision = p_decision,
        decision_reason = nullif(trim(coalesce(p_decision_reason, '')), ''),
        decided_by = auth.uid(),
        decided_at = now()
    where id = target_report_id;

  -- 'removed_member' não grava nem avisa aqui: remove_group_member já faz
  -- as duas coisas (desde 0066).
  if p_decision <> 'removed_member' then
    insert into public.moderation_actions (scope, group_id, actor_id, target_user_id, action, reason, source, source_id)
    values ('group', r.group_id, auth.uid(), r.reported_user_id, p_decision, p_decision_reason, 'message_report', target_report_id);
    if p_decision <> 'kept_message' then
      notif_title := case p_decision
        when 'deleted_message' then 'Uma mensagem sua foi removida'
        when 'muted_user' then 'Você foi silenciado no grupo por 7 dias'
      end;
      insert into public.notifications (user_id, type, title, body)
      values (r.reported_user_id, 'moderation_decision', notif_title, 'Motivo: ' || p_decision_reason);
    end if;
  end if;
end;
$$;
