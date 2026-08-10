-- Horário e dias da semana do lembrete de leitura ficam configuráveis por
-- inscrição (ver toggle + seletor em ProfileScreen.jsx) — antes eram fixos
-- em 07:00, seg-sex, direto no código do cron (api/send-reading-reminders.js).
alter table public.push_subscriptions
  add column if not exists reminder_hour smallint not null default 7,
  add column if not exists reminder_days text[] not null default '{Mon,Tue,Wed,Thu,Fri}';

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_reminder_hour_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_reminder_hour_check check (reminder_hour between 0 and 23);

-- Mesmas siglas de 3 letras que Intl.DateTimeFormat(...).formatToParts()
-- devolve pro campo "weekday" em inglês (ver isReminderTimeIn no cron) —
-- guardar nesse formato evita converter pra lá e pra cá a cada checagem.
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_reminder_days_check;
alter table public.push_subscriptions
  add constraint push_subscriptions_reminder_days_check
  check (reminder_days <@ array['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
