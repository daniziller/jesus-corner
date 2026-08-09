-- Funil do onboarding: quantas sessões chegam em cada passo do wizard de
-- primeiro acesso (src/screens/AuthScreen.jsx, OnboardingWizard) vs quantas
-- realmente fecham assinatura. Gravado por sessão anônima (session_id
-- gerado no cliente, ver src/analytics/onboardingEvents.js) porque a conta
-- só existe a partir do passo de cadastro — sem isso não daria pra contar
-- quem abandona antes de criar conta.
create table public.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  step text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index onboarding_events_session_id_idx on public.onboarding_events (session_id);
create index onboarding_events_step_created_at_idx on public.onboarding_events (step, created_at);

-- RLS habilitado sem policies: mesmo padrão de admin_invites/contact_messages
-- (só o service role, usado em api/track-onboarding-event.js e
-- api/admin/metrics.js, tem acesso — nunca fica exposto via PostgREST anon).
alter table public.onboarding_events enable row level security;

-- Pra "quantas realmente fecham a assinatura": subscriptions é upsert (ver
-- api/stripe-webhook.js), então updated_at não serve pra contar conversões
-- no período — fica sempre na última mudança de status, não na primeira.
-- created_at simples resolve pra maioria dos casos (o upsert nunca inclui
-- essa coluna no payload, então o default só é aplicado na criação da
-- linha, nunca sobrescrito numa atualização).
alter table public.subscriptions add column created_at timestamptz not null default now();
