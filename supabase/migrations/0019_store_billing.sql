-- Jesus' Corner — assinatura via Google Play Billing (TWA/Android) e Apple
-- StoreKit (iOS), além do Stripe (web/PWA). Stripe continua exatamente como
-- está (valor livre, price_data dinâmico) — Play Billing e StoreKit só
-- aceitam preços fixos pré-cadastrados no respectivo console, por isso os
-- valores oferecidos lá são um menu fechado de 11 preços (5 mensais + 6
-- anuais — ver src/billing/storeTiers.js), diferente dos presets livres do
-- Stripe em UpgradeScreen.jsx.
--
-- billing_provider é só rótulo/roteamento (qual loja processou a cobrança
-- recorrente, usado só pra saber pra onde mandar a pessoa quando quiser
-- gerenciar/cancelar) — access_type continua sendo a fonte de verdade pro
-- acesso, sem nenhuma mudança em isPremiumActive/PaywallGate. Linhas
-- gravadas antes desta migration (todas via Stripe ou grátis) recebem
-- billing_provider = 'stripe' pelo default; a linha abaixo corrige as
-- contas grátis pra 'none' (nunca tocaram o Stripe nem nenhuma loja).
--
-- google_play_purchase_token é o identificador estável de uma assinatura no
-- Play (mesmo token através de renovações — só muda se a pessoa cancelar e
-- assinar de novo, ou trocar de tier) — é por ele que
-- api/google-play-rtdn.js encontra a linha certa pra atualizar, já que a
-- notificação do Pub/Sub não carrega user_id. google_play_order_id NÃO é
-- único de propósito — muda a cada renovação.
--
-- apple_original_transaction_id é o equivalente da Apple (estável através
-- de renovações e trocas de tier dentro do mesmo grupo de assinatura) — é
-- por ele que api/apple-server-notifications.js localiza a linha.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.subscriptions
  add column if not exists billing_provider text not null default 'stripe'
    check (billing_provider in ('stripe', 'google_play', 'apple', 'none')),
  add column if not exists google_play_purchase_token text unique,
  add column if not exists google_play_product_id text,
  add column if not exists google_play_order_id text,
  add column if not exists apple_original_transaction_id text unique,
  add column if not exists apple_product_id text;

update public.subscriptions set billing_provider = 'none' where access_type = 'free';

-- Sem mudança de RLS: a policy de select-própria-linha / write-só-service-role
-- já criada em 0016_subscriptions.sql cobre as colunas novas automaticamente.
