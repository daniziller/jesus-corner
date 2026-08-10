-- Minuto do lembrete, além da hora (ver migration 0028) — em múltiplos de 5
-- (0, 5, 10, ..., 55), porque o cron passa a rodar a cada 5 minutos (ver
-- vercel.json) em vez de 1x/hora. Minuto exato, qualquer um, exigiria cron
-- a cada minuto — 12x mais invocações só pra ganhar uma precisão que não
-- faz diferença perceptível num lembrete de leitura.
alter table public.push_subscriptions
  add column if not exists reminder_minute smallint not null default 0;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_reminder_minute_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_reminder_minute_check
  check (reminder_minute between 0 and 59 and reminder_minute % 5 = 0);
