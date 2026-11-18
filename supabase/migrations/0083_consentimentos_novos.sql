-- Novas finalidades de consentimento (revisão de LGPD, 2026-11-18). A
-- tabela é a mesma de 0025 (append-only, gravada só pelo servidor em
-- api/record-consent.js e api/unsubscribe.js).
--
--   adult          — declaração de maioridade (18+), agora numa caixa
--                    própria e exigida pelo servidor junto com os termos.
--   ai_processing  — escrita assistida: o texto que a pessoa escreve vai
--                    para o modelo de IA, fora do Brasil. Opt-in, pode ser
--                    desligado; sem ele os endpoints de IA respondem 403
--                    ai_consent_required (api/_lib/aiBudget.js).
--   weekly_email   — o e-mail do resumo semanal. Sem linha = recebe; a
--                    pessoa desliga pelo link do e-mail ou em Privacidade.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

alter table public.consents drop constraint if exists consents_purpose_check;
alter table public.consents add constraint consents_purpose_check check (purpose in (
  'terms', 'sensitive_data', 'adult', 'marketing_email', 'public_profile', 'ai_processing', 'weekly_email'
));

-- A leitura "linha mais recente por pessoa e finalidade" (resumo semanal,
-- avisos, conferência antes de cada chamada de IA) usa este índice.
create index if not exists consents_user_purpose_created_idx
  on public.consents (user_id, purpose, created_at desc);
