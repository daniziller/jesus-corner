-- Jesus' Corner — Stripe pode entregar webhooks fora de ordem; o handler
-- (api/stripe-webhook.js) escrevia direto via upsert incondicional, sem
-- nenhuma proteção contra isso (varredura geral, 2026-09-19).
--
-- Cenário real: trocar de plano cancela a assinatura ANTIGA só depois da
-- NOVA já estar confirmada (ver comentário em api/create-checkout-
-- session.js) — mas esse próprio cancelamento dispara um novo evento
-- webhook (customer.subscription.updated/deleted) pra assinatura antiga,
-- com o MESMO supabase_user_id no metadata. O Stripe não garante ordem de
-- entrega entre eventos; se o evento de cancelamento da assinatura ANTIGA
-- chegasse DEPOIS do evento da assinatura NOVA (plausível sob retry/
-- latência), a linha virava `status: 'canceled'` / `stripe_subscription_
-- id: <id antigo>` de novo — uma pessoa pagando e ativa "sumia" pro app.
--
-- Correção: nova coluna `stripe_event_at` (quando o EVENTO do Stripe foi
-- criado, não quando o webhook foi processado) + uma RPC que faz o
-- upsert de forma atômica, só aplicando a escrita quando o evento
-- recebido é IGUAL OU MAIS NOVO que o último já aplicado pra esse usuário
-- — o mecanismo padrão recomendado pelo próprio Stripe pra lidar com
-- entrega fora de ordem (usar o timestamp do EVENTO, nunca a ordem de
-- chegada). Um evento antigo chegando atrasado agora é ignorado, não
-- aplicado por cima de um mais novo.
--
-- Aproveitando: a RPC também passa a gravar `billing_provider = 'stripe'`
-- explicitamente (achado relacionado na mesma varredura) — o upsert
-- antigo nunca tocava essa coluna, então um `billing_provider` anterior
-- ('google_play'/'apple', de antes da pessoa trocar pra cobrança via
-- site) sobrevivia intacto por baixo de uma assinatura Stripe nova,
-- deixando `getManageSubscriptionUrl` mandando a pessoa pra loja errada
-- pra gerenciar uma assinatura que na verdade é Stripe agora.
--
-- Só o service role chama esta RPC (usado exclusivamente pelo webhook,
-- api/stripe-webhook.js) — de propósito SEM grant pra `authenticated`:
-- ninguém client-side pode alterar o próprio status de assinatura mesmo
-- via esta função (mesma razão de RLS de 0016_subscriptions.sql).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente. Pressupõe 0016 e 0019 já rodados.

alter table public.subscriptions add column if not exists stripe_event_at timestamptz;

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
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (
    user_id, stripe_customer_id, stripe_subscription_id, status, plan, tier,
    access_type, amount_cents, currency, current_period_end, billing_provider,
    stripe_event_at, updated_at
  ) values (
    p_user_id, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_plan, p_tier,
    p_access_type, p_amount_cents, p_currency, p_current_period_end, 'stripe',
    p_event_at, now()
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
  where public.subscriptions.stripe_event_at is null
     or public.subscriptions.stripe_event_at <= excluded.stripe_event_at;
end;
$$;
