-- Jesus' Corner — chat com IA sobre o texto bíblico em leitura (aba
-- "Perguntar à IA" em ReadingBlockView.jsx). Diferente de user_data (um
-- "blob" só com o estado atual), esta é uma tabela de EVENTOS — cada
-- mensagem (da pessoa ou da IA) vira uma linha própria, nunca atualizada
-- depois, só inserida — mesmo espírito de friend_activity (0005).
--
-- Só o endpoint (api/chat-about-text.js) grava de fato — ele chama o
-- Supabase com o Authorization do próprio usuário (mesmo padrão de
-- api/generate-theme-plan.js, não service role), então a policy de insert
-- abaixo (dono da linha) precisa existir pra esse insert funcionar; o
-- client nunca chama isso direto, só o endpoint, depois de passar pelos
-- guardrails de escopo/assunto sensível. Expira em 60 dias via o cron de
-- retenção que já existe (ver POLICIES em api/retention.js).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

create table if not exists public.text_ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Mesmo formato de noteKeyFor() em src/notes/notesStore.js: "Livro:chStart-chEnd".
  passage_key text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.text_ai_chats enable row level security;

create index if not exists text_ai_chats_user_passage_idx
  on public.text_ai_chats (user_id, passage_key, created_at);

drop policy if exists "usuario ve as proprias mensagens" on public.text_ai_chats;
create policy "usuario ve as proprias mensagens" on public.text_ai_chats
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "usuario insere as proprias mensagens" on public.text_ai_chats;
create policy "usuario insere as proprias mensagens" on public.text_ai_chats
  for insert
  to authenticated
  with check (auth.uid() = user_id);
