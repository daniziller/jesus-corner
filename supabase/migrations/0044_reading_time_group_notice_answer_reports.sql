-- Jesus' Corner — redesign Bento, etapa 3d.
--
-- 1) reading_seconds: tempo de leitura acumulado (segundos), somado pelo
--    leitor imersivo enquanto o texto está aberto e a aba visível (ver
--    src/reading/readingTimeStore.js). Alimenta "horas de leitura acumulada"
--    no painel do Início (quadro 12a) — um dos três números que só sobem.
-- 2) group_notice_enabled: chave "Aviso do grupo" dos Ajustes de IA (10f):
--    "seu grupo terminou o capítulo de hoje". Desligada por padrão; a tela só
--    mostra a chave pra quem está num grupo. O envio do aviso em si lê esta
--    coluna (cron futuro, ainda não existe).
-- 3) ai_answer_reports: "Reportar resposta" (10b). Ao reportar, a resposta
--    sai do histórico do aparelho e vem pra cá pra revisão. Gravado pelo
--    servidor (api/report-ai-answer.js) com a service role — a tabela só tem
--    policy de SELECT do próprio usuário, ninguém insere direto.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists reading_seconds integer not null default 0
    check (reading_seconds >= 0);

alter table public.user_data
  add column if not exists group_notice_enabled boolean not null default false;

create table if not exists public.ai_answer_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- "Livro:capítulo:vInício-vFim", mesmo formato do log em text_ai_chats.
  passage_key text not null,
  lang text not null default 'pt',
  tone text,
  question text not null,
  -- A resposta inteira como veio do servidor (outcome, reply, citações).
  answer jsonb not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.ai_answer_reports enable row level security;

create index if not exists ai_answer_reports_status_idx
  on public.ai_answer_reports (status, created_at);

drop policy if exists "usuario ve os proprios reportes" on public.ai_answer_reports;
create policy "usuario ve os proprios reportes" on public.ai_answer_reports
  for select using (auth.uid() = user_id);
