-- Inscrições de push (Web Push API) — cada linha é um navegador/dispositivo
-- que aceitou receber o lembrete diário de leitura (ver toggle "Lembretes"
-- em ProfileScreen.jsx). Guardamos o fuso horário no momento da inscrição
-- pra o cron (api/send-reading-reminders.js) saber quando é 07:00 pra cada
-- pessoa, sem depender de um cron por fuso.
--
-- Uma pessoa pode ter mais de uma linha (celular + desktop, por exemplo) —
-- por isso a chave é o endpoint (identifica o dispositivo/navegador único),
-- não o user_id.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- O dono cria e apaga a própria inscrição (ativar/desativar o toggle) —
-- não tem update porque trocar de fuso ou de chaves é, na prática, apagar e
-- inscrever de novo. Leitura para a service role do cron (que ignora RLS).
create policy "users manage own push subscriptions" on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
