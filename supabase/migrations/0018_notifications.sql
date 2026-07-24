-- Notificações persistentes — até agora o sino (NotificationBell.jsx) só
-- mostrava dados computados na hora (pedidos de amizade, convites de
-- grupo, atividade de amigos). Esta tabela guarda notificações de verdade,
-- geradas pelo backend (hoje só o lembrete de contribuição, ver
-- api/send-contribution-reminders.js), que precisam persistir entre
-- sessões e ser marcadas como lidas.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on notifications(user_id, created_at desc);

alter table notifications enable row level security;

-- Cada pessoa só vê as próprias notificações.
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

-- Só pra marcar como lida — não dá pra criar novas por aqui (RLS não tem
-- policy de insert pra usuário autenticado, só a service role que o
-- endpoint de cron usa passa por cima da RLS de propósito).
create policy "Users can mark their own notifications as read"
  on notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
