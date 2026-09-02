-- Jesus' Corner — dois níveis pagos: Premium e Premium + IA.
--
-- Até aqui existia um único plano pago (monthly/annual) que dava acesso a
-- tudo, incluindo os recursos de IA (chat sobre o texto, planos e estudos
-- gerados, busca nas anotações). Agora o pago se divide em dois:
--
--   premium     — voz natural, modo mãos-livres, rotina guiada, XP/níveis/
--                 conquistas, plano cronológico, notas, comunidade.
--   premium_ai  — tudo do premium + os recursos de IA.
--
-- `tier` só é relevante quando a assinatura está ativa (ver isPremiumActive
-- em src/billing/subscriptionStore.js e resolveEntitlement em
-- src/billing/entitlement.js). Sem linha, ou linha inativa, = tier grátis.
--
-- Backfill: todo mundo que HOJE tem acesso (assinante ativo/trial, ou conta
-- de acesso grátis/vitalício concedido pelo admin) recebia IA junto, então
-- migra pra 'premium_ai' pra ninguém perder recurso. Novas assinaturas
-- gravam o tier certo a partir do SKU comprado (ver
-- api/verify-google-play-purchase.js / verify-apple-purchase.js /
-- create-checkout-session.js).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.subscriptions
  add column if not exists tier text not null default 'premium'
    check (tier in ('premium', 'premium_ai'));

update public.subscriptions
  set tier = 'premium_ai'
  where status in ('active', 'trialing')
     or access_type in ('free', 'lifetime');

-- Sem mudança de RLS: a policy de select-própria-linha / write-só-service-role
-- de 0016_subscriptions.sql já cobre a coluna nova automaticamente.
