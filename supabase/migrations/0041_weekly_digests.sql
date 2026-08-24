-- Boletim semanal (ver api/send-weekly-digest.js) — registra as últimas
-- semanas já enviadas por usuário, só pra deduplicar (o cron roda semanal
-- mas não custa nada ser à prova de reexecução acidental/retry). Guarda só
-- a chave da semana (segunda-feira, YYYY-MM-DD) e quando foi enviado — o
-- conteúdo em si já foi entregue por notificação + email, não precisa
-- persistir de novo aqui.
alter table public.user_data
  add column if not exists weekly_digests jsonb not null default '[]'::jsonb;
