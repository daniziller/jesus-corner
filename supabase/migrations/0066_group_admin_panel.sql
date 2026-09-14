-- Jesus' Corner — painel do admin de grupo (handoff-admin-42, Bloco 2:
-- 42i "Painel do grupo" + 42j "Membros" + 42k "Quem está lendo").
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002, 0045, 0046,
-- 0047, 0049 (chapters_read), 0048 (group_reading_plans) e 0065 já rodados.

-- ═══════════════════════════════════════════════════════════════
-- 1. Aviso fixado no topo do mural (42i, linha "Fixar aviso no topo") —
--    sem tela própria no pacote (nenhum PNG mostra o destino desse
--    toque), implementado como um campo simples de texto no grupo,
--    mostrado no topo do mural pros membros (GroupsScreen.jsx).
-- ═══════════════════════════════════════════════════════════════

alter table public.reading_groups add column if not exists pinned_notice text;

create or replace function public.set_group_pinned_notice(target_group_id uuid, p_notice text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode fixar um aviso.';
  end if;
  update public.reading_groups
    set pinned_notice = nullif(trim(coalesce(p_notice, '')), '')
    where id = target_group_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Silenciar com prazo escolhido (42j, folha de ações — "1, 7 ou 30
--    dias"). Diferente do silenciar de 7 dias fixo embutido em
--    decide_group_message_report (0065), que continua como está —
--    aquele é uma DECISÃO sobre denúncia; este é a ação direta do
--    admin sobre qualquer membro, com motivo (checklist do HANDOFF:
--    "campo de motivo obrigatório em toda ação de moderação").
-- ═══════════════════════════════════════════════════════════════

create or replace function public.silence_group_member(
  target_group_id uuid,
  target_user_id uuid,
  duration_days integer,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode silenciar um membro.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Não dá pra silenciar a si mesmo.';
  end if;
  if duration_days not in (1, 7, 30) then
    raise exception 'Duração inválida.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Motivo é obrigatório pra silenciar.';
  end if;

  update public.reading_group_members
    set silenced_until = now() + (duration_days || ' days')::interval
    where group_id = target_group_id and user_id = target_user_id and role = 'member';

  insert into public.moderation_actions (scope, group_id, actor_id, target_user_id, action, reason, source)
  values ('group', target_group_id, auth.uid(), target_user_id, 'muted_user_' || duration_days || 'd', p_reason, 'manual');

  insert into public.notifications (user_id, type, title, body)
  values (
    target_user_id, 'moderation_decision',
    'Você foi silenciado no grupo por ' || duration_days || ' dias',
    'Motivo: ' || p_reason
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Remover membro — acrescenta motivo + registro + notificação
--    (a versão de 0047 apagava a linha em silêncio, sem grava nada;
--    o checklist deste pacote exige registro em toda ação). Precisa
--    dropar a versão de 2 parâmetros antes: create or replace não
--    troca uma função existente quando a lista de parâmetros muda,
--    cria uma segunda sobrecarga — e as duas com o mesmo nome
--    confundiriam o PostgREST na hora de resolver a chamada.
-- ═══════════════════════════════════════════════════════════════

drop function if exists public.remove_group_member(uuid, uuid);

create or replace function public.remove_group_member(
  target_group_id uuid,
  target_user_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode remover um membro.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Use "sair do grupo" pra remover a si mesmo.';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Motivo é obrigatório pra remover um membro.';
  end if;

  -- Sempre pelo botão "tornar admin" antes, nunca remover um moderador
  -- direto por aqui (mesma regra de 0047: a UI só mostra "remover" pra
  -- membros comuns).
  delete from public.reading_group_members
  where group_id = target_group_id and user_id = target_user_id and role = 'member';

  insert into public.moderation_actions (scope, group_id, actor_id, target_user_id, action, reason, source)
  values ('group', target_group_id, auth.uid(), target_user_id, 'removed_member', p_reason, 'manual');

  insert into public.notifications (user_id, type, title, body)
  values (target_user_id, 'moderation_decision', 'Você foi removido do grupo', 'Motivo: ' || p_reason);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3b. Corrige decide_group_message_report (0065): ela chama
--     remove_group_member(group_id, user_id) com 2 argumentos — agora
--     que o 3º (motivo) é OBRIGATÓRIO dentro de remove_group_member,
--     essa chamada quebraria toda vez que a decisão fosse "removido do
--     grupo". Corrige repassando o motivo que ela mesma já recebeu e
--     validou (p_decision_reason).
-- ═══════════════════════════════════════════════════════════════

create or replace function public.decide_group_message_report(
  target_report_id uuid,
  p_decision text,
  p_decision_reason text default null
)
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
      delete from public.group_comments where id = r.message_id;
    else
      delete from public.group_chapter_posts where id = r.message_id;
    end if;
  elsif p_decision = 'muted_user' then
    update public.reading_group_members
      set silenced_until = now() + interval '7 days'
      where group_id = r.group_id and user_id = r.reported_user_id;
  elsif p_decision = 'removed_member' then
    perform public.remove_group_member(r.group_id, r.reported_user_id, p_decision_reason);
  end if;

  update public.group_message_reports set
    status = 'resolved',
    decision = p_decision,
    decision_reason = nullif(trim(coalesce(p_decision_reason, '')), ''),
    decided_by = auth.uid(),
    decided_at = now()
  where id = target_report_id;

  -- 'removed_member' NÃO grava/avisa aqui embaixo — remove_group_member
  -- (chamado acima) já faz as duas coisas por si, desde 0066. Duplicaria
  -- o registro E mandaria dois avisos pra mesma pessoa pela mesma ação.
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

-- ═══════════════════════════════════════════════════════════════
-- 4. "Escrever para os N" (42k) — mensagem individual (não recado no
--    mural) pra quem parou de ler. Sem sistema de conversa 1:1 no app
--    ainda; reaproveita notifications (0018, já lida pelo sino) —
--    satisfaz "individual" (só quem recebe vê) sem construir uma
--    infraestrutura de mensageria nova só pra isto.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.send_group_encouragement(
  target_group_id uuid,
  target_user_ids uuid[],
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  gname text;
  uid uuid;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode escrever pros membros do grupo.';
  end if;
  if coalesce(trim(p_message), '') = '' then
    raise exception 'Escreva uma mensagem.';
  end if;

  select name into gname from public.reading_groups where id = target_group_id;

  foreach uid in array target_user_ids loop
    if public.is_group_member(target_group_id, uid) then
      insert into public.notifications (user_id, type, title, body)
      values (uid, 'group_encouragement', 'Mensagem de ' || coalesce(gname, 'seu grupo'), p_message);
    end if;
  end loop;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Quem está lendo (42k) — régua real dos últimos 7 dias por membro.
--    Moderador só, e só do PRÓPRIO grupo — é essa exigência (Regra 6.7:
--    "os membros não têm acesso a esta tela") que justifica um RPC
--    privilegiado em vez do caminho normal de progresso de amigo
--    (get_friend_progress_summary, que exige amizade aceita — não dá
--    pra usar aqui pra N membros quaisquer do grupo, ver comentário
--    antigo em GroupAdminScreen.jsx sobre a mesma limitação).
--
--    "Dia N" = dias distintos em que a pessoa leu algo desde que o
--    plano do grupo começou (ou desde que entrou no grupo, sem plano)
--    — o próprio ritmo dela, não o dia do calendário (por isso duas
--    pessoas no mesmo grupo aparecem em dias diferentes: quem faltou
--    fica pra trás). "dias_since_last_read" classifica em dia (0-1),
--    atrasado (2-6) ou parou (7+) — decisão registrada no comentário
--    do PROMPT-CODE.md desta leva, não um número dado pelo HANDOFF.
-- ═══════════════════════════════════════════════════════════════

create or replace function public.get_group_reading_activity(target_group_id uuid)
returns table (
  member_user_id uuid,
  member_name text,
  member_role text,
  is_me boolean,
  days_active_last_7 boolean[],
  days_since_last_read integer,
  plan_day_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_start timestamptz;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode ver quem está lendo.';
  end if;

  select starts_at into plan_start
    from public.group_reading_plans
    where group_id = target_group_id
    order by created_at desc
    limit 1;

  return query
  select
    m.user_id,
    p.name,
    m.role,
    (m.user_id = auth.uid()),
    (
      select array_agg(
        exists(
          select 1 from public.chapters_read cr
          where cr.user_id = m.user_id and cr.created_at::date = d::date
        ) order by d
      )
      from generate_series((current_date - 6)::timestamp, current_date::timestamp, interval '1 day') d
    ),
    (
      select (current_date - max(cr.created_at::date))::integer
      from public.chapters_read cr
      where cr.user_id = m.user_id
    ),
    (
      select count(distinct cr.created_at::date)::integer
      from public.chapters_read cr
      where cr.user_id = m.user_id
        and cr.created_at >= coalesce(plan_start, m.joined_at)
    )
  from public.reading_group_members m
  join public.profiles p on p.user_id = m.user_id
  where m.group_id = target_group_id and m.status = 'joined'
  order by p.name;
end;
$$;
