-- Jesus' Corner — painel do Master (handoff-admin-42, Bloco 4: 42f
-- "Moderação" + 42g "Grupos e igrejas" + 42h "Acessos").
--
-- Diferente dos Blocos 1-3 (RPCs security definer, checando
-- is_group_moderator): as ações daqui são do MASTER, que age em QUALQUER
-- grupo — não faz sentido nenhuma delas checar "sou moderador deste
-- grupo específico". Por isso este bloco não usa RPC nenhuma; as telas
-- chamam api/admin/*.js (service role + requireAdmin, mesmo padrão de
-- api/admin/answer-reports.js), que bypassa RLS de propósito.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente). Pressupõe 0065, 0066, 0067
-- já rodados.

-- ═══════════════════════════════════════════════════════════════
-- 1. Contas bloqueadas (42c/42d/42f — "Bloquear conta", só o Master).
--    O bloqueio de LOGIN em si usa supabase.auth.admin.updateUserById
--    (ban_duration) via service role, direto no endpoint — esta tabela é
--    só o registro visível (motivo, quem bloqueou, quando), pra 42d
--    mostrar "conta bloqueada" e pra dar um jeito de desbloquear depois.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.blocked_accounts (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  blocked_by uuid not null references public.profiles(user_id),
  reason text not null,
  blocked_at timestamptz not null default now()
);

alter table public.blocked_accounts enable row level security;
-- Sem policy nenhuma pra usuário comum — só o painel do Master (service
-- role) lê/escreve. Ninguém, nem a própria pessoa bloqueada, deveria ver
-- esta tabela pela RLS normal.

-- ═══════════════════════════════════════════════════════════════
-- 2. Acesso cortesia (42h "Conceder acesso") — 3/6/12 meses ou vitalício,
--    motivo obrigatório. Concede acesso de verdade preenchendo
--    subscriptions (o mesmo mecanismo que já dá acesso pago/vitalício —
--    ver Parte 1 do plano de tiers, subscriptionStore.js), então nenhuma
--    tela do app precisa saber que este acesso é cortesia; access_grants
--    aqui é só o REGISTRO (motivo, quem concedeu, tipo) que 42h precisa
--    pra listar/calcular receita abdicada — subscriptions sozinha não
--    guarda "por quê".
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  granted_by uuid not null references public.profiles(user_id),
  kind text not null check (kind in ('3_months', '6_months', '12_months', 'lifetime')),
  reason text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists access_grants_user_idx on public.access_grants(user_id, created_at desc);

alter table public.access_grants enable row level security;
-- Mesma razão de blocked_accounts — só o Master (service role) mexe aqui.
