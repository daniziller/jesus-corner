-- Jesus' Corner — denúncia de mensagem do mural do grupo (handoff-admin-42,
-- Bloco 1: 42p "Membro denuncia" + 42l "Mensagem denunciada").
--
-- Fluxo real (Regra 6 do PROMPT-CODE.md): 42p grava a denúncia com motivo e
-- denunciante (NUNCA exposto ao denunciado) → aparece pro admin do grupo em
-- 42l → sem decisão em 24h, escala sozinha (vira alerta do Master em 42b e
-- entra na fila de 42f com o selo "Subiu do grupo" — consumido só nos
-- Blocos 4/5, mas o prazo já precisa estar gravando de verdade agora,
-- por isso o cron de escalação (api/escalate-group-reports.js) já vem
-- neste bloco, mesmo sem ninguém lendo status='escalated' ainda).
--
-- `message_kind`/`message_id` é uma referência "solta" (sem FK) porque a
-- mensagem denunciada pode vir de DUAS tabelas diferentes — o mural geral
-- (group_comments) ou a sala de um capítulo (group_chapter_posts). Postgres
-- não tem FK polimórfica; `message_snapshot` guarda o texto no momento da
-- denúncia pra sobreviver mesmo se a mensagem original for apagada antes
-- da decisão. Bloco 1 só liga o "denunciar" a group_comments (o mural de
-- 42p/42i) — group_chapter_posts fica preparado no schema, sem produtor
-- ainda, pra não precisar de migração nova quando entrar.
--
-- `moderation_actions` é o registro cross-cutting citado na Regra 6.2
-- ("toda ação de qualquer nível grava autor, data, alvo e motivo; aparece
-- em 42d e é exportável em 42f") — criado já aqui, mesmo os consumidores
-- (42d/42f) sendo só do Bloco 4/5, pra não reescrever a forma da tabela
-- depois de já ter dado várias decisões nela.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002, 0045, 0047 e
-- 0018 (notifications) já rodados.

-- ═══════════════════════════════════════════════════════════════
-- 1. COLUNA NOVA — silenciar por prazo (diferente de reading_group_members
--    .muted, que é preferência PESSOAL de notificação do próprio grupo,
--    sem nenhuma tela ainda; isto aqui é AÇÃO DE MODERAÇÃO sobre outra
--    pessoa, com prazo, usada por 42l/42j/42c/42f).
-- ═══════════════════════════════════════════════════════════════

alter table public.reading_group_members add column if not exists silenced_until timestamptz;

-- ═══════════════════════════════════════════════════════════════
-- 2. group_message_reports
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.group_message_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  message_kind text not null check (message_kind in ('comment', 'chapter_post')),
  message_id uuid not null,
  message_snapshot text not null,
  reported_user_id uuid not null references public.profiles(user_id) on delete cascade,
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  reason text not null check (reason in ('propaganda', 'cobranca', 'linguagem_agressiva', 'conteudo_improprio', 'outro')),
  reason_detail text,
  -- pending: esperando o admin do grupo (janela de 24h a partir de created_at).
  -- escalated: passou das 24h sem decisão — o cron (api/escalate-group-reports.js) marca sozinho.
  -- resolved: alguém decidiu (admin do grupo OU, depois de escalar, o Master).
  status text not null default 'pending' check (status in ('pending', 'escalated', 'resolved')),
  decision text check (decision in ('deleted_message', 'muted_user', 'removed_member', 'kept_message')),
  decision_reason text,
  decided_by uuid references public.profiles(user_id),
  decided_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists group_message_reports_group_status_idx
  on public.group_message_reports(group_id, status, created_at);

alter table public.group_message_reports enable row level security;

-- Só o moderador do grupo lê — o denunciante nunca revê a própria denúncia
-- por aqui (não precisa, nenhuma tela pede isso) e o denunciado NUNCA vê
-- (é a regra central do fluxo, "[Nome] não fica sabendo quem denunciou").
drop policy if exists "moderador le denuncias do grupo" on public.group_message_reports;
create policy "moderador le denuncias do grupo" on public.group_message_reports
  for select using (public.is_group_moderator(group_id));

-- Sem policy de insert/update pra usuário comum de propósito — criar é só
-- via report_group_message() e decidir só via decide_group_message_report()
-- (as duas abaixo, security definer), pra nunca deixar alguém forjar
-- reporter_id/reported_user_id diferente da própria sessão nem burlar a
-- checagem de moderador. Mesmo raciocínio de set_comment_pinned (0003).

-- ═══════════════════════════════════════════════════════════════
-- 3. moderation_actions — registro cross-cutting (Regra 6.2)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('group', 'platform')),
  group_id uuid references public.reading_groups(id) on delete set null,
  actor_id uuid not null references public.profiles(user_id),
  target_user_id uuid references public.profiles(user_id),
  action text not null,
  reason text,
  source text,
  source_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_target_idx
  on public.moderation_actions(target_user_id, created_at desc);

alter table public.moderation_actions enable row level security;

-- Moderador vê o registro do PRÓPRIO grupo (42j/42l mais adiante). Linhas
-- scope='platform' (ações do Master, ex: bloquear conta) não têm policy de
-- select pra usuário comum — só o painel do Master (service role, Bloco 4/5)
-- as lê, mesmo padrão de api/admin/*.js.
drop policy if exists "moderador le registro do proprio grupo" on public.moderation_actions;
create policy "moderador le registro do proprio grupo" on public.moderation_actions
  for select using (group_id is not null and public.is_group_moderator(group_id));

-- ═══════════════════════════════════════════════════════════════
-- 4. RPC — denunciar uma mensagem (42p)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.report_group_message(
  target_group_id uuid,
  p_message_kind text,
  p_message_id uuid,
  p_reported_user_id uuid,
  p_message_snapshot text,
  p_reason text,
  p_reason_detail text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.is_group_member(target_group_id) then
    raise exception 'Você precisa ser do grupo pra denunciar uma mensagem dele.';
  end if;
  if p_reported_user_id = auth.uid() then
    raise exception 'Não dá pra denunciar a própria mensagem.';
  end if;
  if p_message_kind not in ('comment', 'chapter_post') then
    raise exception 'Tipo de mensagem inválido.';
  end if;
  if p_reason not in ('propaganda', 'cobranca', 'linguagem_agressiva', 'conteudo_improprio', 'outro') then
    raise exception 'Motivo inválido.';
  end if;

  insert into public.group_message_reports (
    group_id, message_kind, message_id, message_snapshot,
    reported_user_id, reporter_id, reason, reason_detail
  ) values (
    target_group_id, p_message_kind, p_message_id, p_message_snapshot,
    p_reported_user_id, auth.uid(), p_reason, nullif(trim(coalesce(p_reason_detail, '')), '')
  ) returning id into new_id;

  return new_id;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. RPC — decidir sobre uma denúncia (42l, e depois 42c/42f pro Master)
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
  -- Motivo obrigatório em toda ação, exceto "manter a mensagem" (o
  -- equivalente aqui a "arquivar sem ação" em 42c — checklist do HANDOFF,
  -- "campo de motivo obrigatório... exceto arquivar").
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
    perform public.remove_group_member(r.group_id, r.reported_user_id);
  end if;
  -- kept_message: nenhum efeito colateral, só resolve a denúncia abaixo.

  update public.group_message_reports set
    status = 'resolved',
    decision = p_decision,
    decision_reason = nullif(trim(coalesce(p_decision_reason, '')), ''),
    decided_by = auth.uid(),
    decided_at = now()
  where id = target_report_id;

  insert into public.moderation_actions (scope, group_id, actor_id, target_user_id, action, reason, source, source_id)
  values ('group', r.group_id, auth.uid(), r.reported_user_id, p_decision, p_decision_reason, 'message_report', target_report_id);

  -- "O motivo é enviado a quem foi moderado" (Regra 6.2) — reaproveita a
  -- tabela notifications (0018) já lida pelo sino (NotificationBell.jsx);
  -- como RPC é security definer, o insert passa por cima da RLS de
  -- notifications (que só permite insert pela service role) do mesmo jeito
  -- que já acontece em toda RPC privilegiada deste arquivo. Conteúdo fixo
  -- em português — decisão simplificada, disclosed: as demais notificações
  -- geradas por cron (send-contribution-reminders.js) leem o idioma salvo
  -- em auth.users.raw_user_meta_data na camada JS, o que uma função SQL
  -- pura não faz hoje; sem isso aqui ainda, quem usa o app em inglês recebe
  -- o aviso em português mesmo assim.
  if p_decision <> 'kept_message' then
    notif_title := case p_decision
      when 'deleted_message' then 'Uma mensagem sua foi removida'
      when 'muted_user' then 'Você foi silenciado no grupo por 7 dias'
      when 'removed_member' then 'Você foi removido do grupo'
    end;
    insert into public.notifications (user_id, type, title, body)
    values (r.reported_user_id, 'moderation_decision', notif_title, 'Motivo: ' || p_decision_reason);
  end if;
end;
$$;
