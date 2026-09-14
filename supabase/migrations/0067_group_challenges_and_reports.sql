-- Jesus' Corner — desafio por IA + canal com o Master (handoff-admin-42,
-- Bloco 3: 42m "Criar desafio" + 42n "A proposta" + 42o "Reportar
-- problema").
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002, 0065, 0066
-- já rodados.

-- ═══════════════════════════════════════════════════════════════
-- 1. Desafio de leitura por IA (42m→42n) — `days` é jsonb (uma entrada
--    por dia: book, bookEn, chStart, chEnd, dayTitle, reflectionQuestion,
--    minutes) em vez de tabela própria por dia: é conteúdo gerado uma vez
--    e nunca consultado por dia isolado fora do próprio desafio (a tela
--    inteira lê tudo de uma vez), o mesmo raciocínio de
--    group_reading_plans.passages (0048).
--
--    Simplificação disclosed: sem convite/aceite formal por membro (o
--    quadro de 42n descreve "os N membros recebem um convite no mural" —
--    não implementado; o desafio publicado fica visível pra todo mundo do
--    grupo automaticamente). group_challenge_members existe só pra
--    acompanhar QUEM leu QUAL dia (criado na primeira vez que a pessoa
--    marca um dia como lido, não por convite aceito) — "quem não entrar
--    segue no plano normalmente" continua verdadeiro: ninguém é obrigado
--    a interagir com o desafio.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id),
  title text not null,
  explanation text,
  leader_text text,
  lang text not null default 'pt' check (lang in ('pt', 'en')),
  days jsonb not null,
  starts_at date not null default current_date,
  pause_group_plan boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists group_challenges_group_idx on public.group_challenges(group_id, created_at desc);

alter table public.group_challenges enable row level security;

drop policy if exists "membro do grupo ve desafios" on public.group_challenges;
create policy "membro do grupo ve desafios" on public.group_challenges
  for select using (public.is_group_member(group_id));

-- Sem policy de insert pra usuário comum — só via publish_group_challenge
-- (RPC, security definer), que confere moderador antes de gravar.

create table if not exists public.group_challenge_members (
  challenge_id uuid not null references public.group_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  completed_days integer[] not null default '{}',
  primary key (challenge_id, user_id)
);

alter table public.group_challenge_members enable row level security;

drop policy if exists "membro do grupo ve progresso do desafio" on public.group_challenge_members;
create policy "membro do grupo ve progresso do desafio" on public.group_challenge_members
  for select using (
    exists (select 1 from public.group_challenges c where c.id = challenge_id and public.is_group_member(c.group_id))
  );

drop policy if exists "cada um mexe no proprio progresso" on public.group_challenge_members;
create policy "cada um mexe no proprio progresso" on public.group_challenge_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Publica o desafio (42n, "Publicar para o grupo") — só moderador. Se
-- pause_group_plan, empurra starts_at de group_reading_plans do grupo pra
-- depois do último dia do desafio (Regra 6.9: "recalcula as datas de
-- retomada do plano"); mostrado ANTES de publicar pelo client (ver
-- computeGroupPlanResumeDate em groupChallengesStore.js), aqui só aplica
-- de verdade.
create or replace function public.publish_group_challenge(
  target_group_id uuid,
  p_title text,
  p_explanation text,
  p_leader_text text,
  p_lang text,
  p_days jsonb,
  p_starts_at date,
  p_pause_group_plan boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  day_count integer;
  latest_plan_id uuid;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode publicar um desafio pro grupo.';
  end if;

  insert into public.group_challenges (group_id, created_by, title, explanation, leader_text, lang, days, starts_at, pause_group_plan)
  values (target_group_id, auth.uid(), p_title, p_explanation, p_leader_text, coalesce(p_lang, 'pt'), p_days, coalesce(p_starts_at, current_date), coalesce(p_pause_group_plan, false))
  returning id into new_id;

  if p_pause_group_plan then
    day_count := jsonb_array_length(p_days);
    select id into latest_plan_id from public.group_reading_plans where group_id = target_group_id order by created_at desc limit 1;
    if latest_plan_id is not null then
      update public.group_reading_plans
        set starts_at = greatest(starts_at, coalesce(p_starts_at, current_date) + day_count)
        where id = latest_plan_id;
    end if;
  end if;

  -- Anuncia no mural (mesma superfície que "os N membros recebem um
  -- convite no mural" descreve) — um post de verdade, não uma tabela de
  -- convite formal por pessoa (ver simplificação disclosed no comentário
  -- do topo do arquivo).
  insert into public.group_comments (group_id, user_id, body)
  values (target_group_id, auth.uid(), '📖 Novo desafio: ' || p_title);

  return new_id;
end;
$$;

-- Marca um dia do desafio como lido (Hoje, card do desafio) — cria a
-- linha de progresso na primeira vez (opt-in implícito pelo uso, não por
-- convite aceito).
create or replace function public.mark_group_challenge_day_done(target_challenge_id uuid, day_index integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_challenge_members (challenge_id, user_id, completed_days)
  values (target_challenge_id, auth.uid(), array[day_index])
  on conflict (challenge_id, user_id) do update
    set completed_days = (
      select array_agg(distinct d) from unnest(public.group_challenge_members.completed_days || day_index) d
    );
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 2. Reportar problema ao Master (42o) — canal DIRETO do admin de grupo
--    pro Master, sem esperar as 24h da escalação de denúncia (0065). Tabela
--    separada de group_message_reports: aqui nem sempre existe uma
--    mensagem (categorias "Erro no app"/"Cobrança"/"Resposta da IA" não
--    são sobre o mural). 42f (Bloco 4, fila do Master) vai UNIR esta
--    tabela com group_message_reports escaladas — os dois alimentam a
--    mesma fila, por caminhos diferentes.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.admin_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id),
  category text not null check (category in ('member', 'app_error', 'ai_response', 'billing', 'other')),
  body text not null,
  attached_user_id uuid references public.profiles(user_id),
  attached_message_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists admin_reports_status_idx on public.admin_reports(status, created_at);

alter table public.admin_reports enable row level security;

-- O admin vê os PRÓPRIOS reports (pra eventualmente conferir o que já
-- mandou — nenhuma tela deste bloco pede isso ainda, mas é uma leitura
-- inofensiva e correta de conceder). Ninguém mais do grupo tem acesso —
-- só o Master (via service role, Bloco 4) lê a fila inteira.
drop policy if exists "autor ve os proprios reports" on public.admin_reports;
create policy "autor ve os proprios reports" on public.admin_reports
  for select using (auth.uid() = created_by);

create or replace function public.create_admin_report(
  target_group_id uuid,
  p_category text,
  p_body text,
  p_attached_user_id uuid default null,
  p_attached_message_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador pode reportar em nome do grupo.';
  end if;
  if p_category not in ('member', 'app_error', 'ai_response', 'billing', 'other') then
    raise exception 'Categoria inválida.';
  end if;
  if coalesce(trim(p_body), '') = '' then
    raise exception 'Descreva o que está acontecendo.';
  end if;

  insert into public.admin_reports (group_id, created_by, category, body, attached_user_id, attached_message_ids)
  values (target_group_id, auth.uid(), p_category, p_body, p_attached_user_id, coalesce(p_attached_message_ids, '{}'))
  returning id into new_id;

  return new_id;
end;
$$;
