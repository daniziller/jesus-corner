-- Registro de acesso do painel do admin (revisão de LGPD, 2026-11-18,
-- segunda entrega — art. 37 e 46). Antes só as AÇÕES ficavam registradas
-- (moderation_actions, admin_broadcast_log); as LEITURAS não — e o painel
-- mostra e-mail, progresso, denúncias e perguntas feitas sobre o texto.
--
-- requireAdmin (api/_lib/adminAuth.js) grava uma linha por chamada: quem,
-- qual endpoint, qual operação e, quando houver, de qual pessoa. Fica 24
-- meses (api/retention.js). Só o service role lê e escreve.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Idempotente.

create table if not exists public.admin_access_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  path text not null,
  op text,
  target_user_id uuid,
  aal text,
  created_at timestamptz not null default now()
);
create index if not exists admin_access_log_created_at_idx on public.admin_access_log (created_at);
create index if not exists admin_access_log_target_idx on public.admin_access_log (target_user_id);

alter table public.admin_access_log enable row level security;
-- Sem política: só o service role.
