-- Jesus' Corner — Plano do grupo (redesign Bento, quadro 22d): o moderador
-- monta um plano (formato Livro, capítulo a capítulo — ver
-- src/groups/groupBookPlan.js) e envia pro grupo; cada membro recebe como
-- convite e pode aceitar/recusar (ninguém tem a leitura trocada sem saber —
-- ver README, "Duas regras de produto"). Quem aceita passa a ler esse plano
-- em vez do fixo, até acabar — mesmo mecanismo de activeAltPlan já usado por
-- plano por tema/cronológico (ver 0031_active_alt_plan.sql), só que tipo
-- 'group' em vez de 'theme'/'chrono'.
--
-- `weeks` é só pra exibição (22d: "Semana 1 · Filipenses 1", "ver as 4") —
-- a leitura de verdade usa `passages`, a mesma lista achatada que já
-- alimenta plano por tema (ver src/themePlans/themeTexts.js).
--
-- A pergunta da semana (sugerida por IA, revisada pelo líder antes de
-- publicar) NÃO tem tabela própria aqui — reaproveita group_chapter_questions
-- (0045_social_reading.sql), a mesma pergunta que já abre a sala do
-- capítulo (17a) pro livro/capítulo da semana.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0002 e 0045 já
-- rodadas antes (usa is_group_member/is_group_moderator e
-- group_chapter_questions).

create table if not exists public.group_reading_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.reading_groups(id) on delete cascade,
  created_by uuid not null references public.profiles(user_id) on delete cascade,
  book text not null,
  book_en text not null,
  title text not null,
  overview text,
  -- [{ chStart, chEnd, readings: [{ chStart, chEnd, words }] }] — só exibição.
  weeks jsonb not null default '[]'::jsonb,
  -- [{ book, chStart, chEnd, words }] achatado, na ordem de leitura — o
  -- mesmo formato que api/generate-theme-plan.js já produz.
  passages jsonb not null,
  starts_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Convite por membro. 'invited' até responder; quem envia (moderador) já
-- nasce 'accepted' (ver send_group_reading_plan abaixo) — ele montou o
-- plano, não faz sentido convidar a si mesmo.
create table if not exists public.group_reading_plan_members (
  plan_id uuid not null references public.group_reading_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

alter table public.group_reading_plans enable row level security;
alter table public.group_reading_plan_members enable row level security;

-- group_reading_plans: visível pra qualquer membro 'joined' do grupo (pra
-- quem ainda não respondeu ver do que se trata antes de decidir, e pra
-- todo mundo ver a leitura da semana na sala do capítulo). Sem INSERT/
-- UPDATE/DELETE direto — só via send_group_reading_plan (RPC abaixo).
drop policy if exists "plano do grupo visivel pro grupo" on public.group_reading_plans;
create policy "plano do grupo visivel pro grupo" on public.group_reading_plans
  for select using (public.is_group_member(group_id));

-- group_reading_plan_members: cada um vê a própria linha (convite/aceite);
-- o moderador do grupo vê todas (pra acompanhar quantos aceitaram — quadro
-- 19c). Sem INSERT/UPDATE direto — só via as RPCs abaixo.
drop policy if exists "convites de plano visiveis pro dono e moderador" on public.group_reading_plan_members;
create policy "convites de plano visiveis pro dono e moderador" on public.group_reading_plan_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.group_reading_plans p
      where p.id = plan_id and public.is_group_moderator(p.group_id)
    )
  );

-- Envia um plano pro grupo — só moderador. Cria a linha do plano e já
-- convida todo mundo que hoje é 'joined' no grupo (o próprio moderador
-- entra 'accepted' na hora, sem precisar responder ao próprio convite).
create or replace function public.send_group_reading_plan(
  target_group_id uuid, book text, book_en text, title text, overview text,
  weeks jsonb, passages jsonb, starts_at date
)
returns public.group_reading_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  new_plan public.group_reading_plans;
begin
  if not public.is_group_moderator(target_group_id) then
    raise exception 'Só um moderador do grupo pode enviar um plano.';
  end if;

  insert into public.group_reading_plans (group_id, created_by, book, book_en, title, overview, weeks, passages, starts_at)
  values (target_group_id, auth.uid(), book, book_en, title, overview,
          coalesce(weeks, '[]'::jsonb), passages, coalesce(starts_at, current_date))
  returning * into new_plan;

  insert into public.group_reading_plan_members (plan_id, user_id, status, responded_at)
  select
    new_plan.id,
    m.user_id,
    case when m.user_id = auth.uid() then 'accepted' else 'invited' end,
    case when m.user_id = auth.uid() then now() else null end
  from public.reading_group_members m
  where m.group_id = target_group_id and m.status = 'joined';

  return new_plan;
end;
$$;

-- Gap conhecido (não corrigido nesta leva): diferente de
-- reading_challenge_progress (que tem handle_group_member_left limpando o
-- placar ao sair do grupo), sair de um grupo NÃO limpa a linha aqui nem o
-- activeAltPlan do cliente (ver App.jsx) — quem sai de um grupo enquanto
-- segue o plano dele continua lendo esse plano até trocar manualmente.
-- Raro na prática (sair de um grupo cujo plano você está seguindo agora
-- mesmo); documentado em vez de resolvido, pra próxima leva se vier a
-- incomodar de verdade.

-- Aceita ou recusa um convite de plano do grupo pendente (quadro 5d/22d:
-- "cada um recebe um aviso e pode recusar"). Não mexe em activeAltPlan
-- aqui — isso é decisão do client (ver src/plan/activePlanStore.js), essa
-- RPC só grava a resposta.
create or replace function public.respond_to_group_reading_plan(target_plan_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.group_reading_plan_members
  set status = case when accept then 'accepted' else 'declined' end, responded_at = now()
  where plan_id = target_plan_id and user_id = auth.uid() and status = 'invited';
end;
$$;
