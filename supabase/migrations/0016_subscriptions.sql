-- Jesus' Corner — status de assinatura (Stripe) por usuário. Alimenta a
-- trava de acesso das abas Rotina e Comunidade (só assinantes) em App.jsx.
--
-- Diferente de user_data (onde o próprio usuário pode dar UPDATE na sua
-- linha pra salvar progresso), status de assinatura NÃO pode ser
-- client-writable: se a policy de UPDATE liberasse o dono da linha, um
-- usuário logado conseguiria se auto-promover a assinante direto pelo
-- client (ex: chamando supabase.from('subscriptions').update(...) no
-- devtools). Por isso: só SELECT é liberado pro dono da linha — nenhuma
-- policy de INSERT/UPDATE/DELETE pra anon/authenticated. Só o service role
-- (usado pelo webhook do Stripe em api/stripe-webhook.js, nunca exposto ao
-- client) escreve aqui, e RLS não vale pro service role.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none' check (status in ('none', 'active', 'trialing', 'past_due', 'canceled')),
  plan text check (plan in ('monthly', 'annual')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "users can view own subscription" on public.subscriptions;
create policy "users can view own subscription" on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sem policy de insert/update/delete de propósito — ver comentário acima.
