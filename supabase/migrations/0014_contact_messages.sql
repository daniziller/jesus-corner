-- Jesus' Corner — mensagens do formulário "Fale Conosco", tanto do app
-- (aba Perfil, usuário logado) quanto do site de comercialização (visitante
-- anônimo, sem conta). Uma única tabela pros dois canais, diferenciados
-- pela coluna `source`.
--
-- Só INSERT é liberado pra quem preenche o formulário (anon E authenticated)
-- — ninguém consegue LER as mensagens de fora, só quem acessa o dashboard
-- do Supabase com a própria conta do projeto. Não precisa de policy de
-- SELECT/UPDATE/DELETE por isso (RLS nega tudo que não tem policy).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  source text not null default 'app' check (source in ('app', 'site')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "anyone can send a message" on public.contact_messages;
create policy "anyone can send a message" on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);
