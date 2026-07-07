-- Jesus' Corner — esquema inicial do backend.
-- Uma linha por usuário, espelhando o formato "lê o blob inteiro, escreve o
-- blob inteiro de volta" que já era usado em cada store do localStorage —
-- minimiza a diferença de lógica entre o protótipo antigo e o backend real.
--
-- Nome e idioma NÃO ficam aqui: são dados de perfil/autenticação e moram no
-- user_metadata do próprio Supabase Auth (definido no signUp). Esta tabela
-- só guarda progresso/conteúdo do app.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do seu projeto
-- Supabase (dashboard.supabase.com → seu projeto → SQL Editor → New query)
-- e clique em "Run". Só precisa rodar uma vez.

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'standard',
  streak integer not null default 0,
  last_login_at timestamptz,
  completed_keys text[] not null default '{}',
  studies_completed text[] not null default '{}',
  notes jsonb not null default '{}'::jsonb,
  prayer_requests jsonb not null default '[]'::jsonb,
  prayer_stats jsonb not null default
    '{"requestsAdded":0,"requestsAnswered":0,"timerCompletions":0}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "users manage own row" on public.user_data;
create policy "users manage own row" on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Cria a linha automaticamente assim que uma conta é criada (evita corrida
-- entre o app consultar user_data antes de ela existir).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_data (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
