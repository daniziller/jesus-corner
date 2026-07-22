-- Jesus' Corner — assinatura de valor livre (pay-what-you-want).
--
-- Troca o modelo de preço fixo (monthly/annual, R$19,90/R$159,90) por um
-- modelo onde a pessoa escolhe qualquer valor: R$0 (grátis, sem tocar o
-- Stripe), um valor recorrente mensal, ou um pagamento único (acesso
-- vitalício). Ver api/create-checkout-session.js, api/activate-free-access.js
-- e api/stripe-webhook.js.
--
-- access_type é a fonte de verdade pro tipo de acesso (free/lifetime/
-- recurring); plan continua existindo por compatibilidade com linhas
-- antigas (monthly/annual) e passa a aceitar também 'lifetime'/'free'.
-- amount_cents/currency são novos e ficam null nas linhas gravadas antes
-- desta migration (não tínhamos essa informação salva).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.subscriptions
  add column if not exists access_type text not null default 'recurring'
    check (access_type in ('free', 'lifetime', 'recurring')),
  add column if not exists amount_cents integer,
  add column if not exists currency text check (currency in ('brl', 'usd'));

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('monthly', 'annual', 'lifetime', 'free'));

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('none', 'active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'));
