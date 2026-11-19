-- Assinatura cancelada que ainda vale até o fim do período (pedido dela,
-- 2026-11-19). Quem cancela pelo Stripe, pelo Google Play ou pela Apple
-- continua com o Premium até a data já paga, e só então vira conta
-- gratuita. Até aqui o app não sabia do cancelamento e seguia mostrando
-- "Premium R$ 27/mês" como se nada tivesse mudado.
--
-- cancel_at_period_end = true: a renovação está desligada; o acesso vai até
-- current_period_end. O app mostra "Cancelada · Premium até [data]" com o
-- botão de reativar. Passada a data, a assinatura deixa de contar mesmo se
-- o aviso de expiração do provedor atrasar (api/_lib/entitlement.js e
-- src/billing/subscriptionStore.js conferem a data).
--
-- Também troca upsert_subscription_from_stripe_event (0073/0077) para
-- receber o campo.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;

drop function if exists public.upsert_subscription_from_stripe_event(uuid, text, text, text, text, text, text, integer, text, timestamptz, timestamptz);

create or replace function public.upsert_subscription_from_stripe_event(
  p_user_id uuid, p_stripe_customer_id text, p_stripe_subscription_id text, p_status text, p_plan text,
  p_tier text, p_access_type text, p_amount_cents integer, p_currency text,
  p_current_period_end timestamptz, p_event_at timestamptz, p_cancel_at_period_end boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, plan, tier,
    access_type, amount_cents, currency, current_period_end, cancel_at_period_end,
    billing_provider, stripe_event_at, updated_at
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_plan, p_tier,
    p_access_type, p_amount_cents, p_currency, p_current_period_end, coalesce(p_cancel_at_period_end, false),
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
    cancel_at_period_end = excluded.cancel_at_period_end,
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

revoke all on function public.upsert_subscription_from_stripe_event(uuid, text, text, text, text, text, text, integer, text, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.upsert_subscription_from_stripe_event(uuid, text, text, text, text, text, text, integer, text, timestamptz, timestamptz, boolean) to service_role;
