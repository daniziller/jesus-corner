-- Jesus' Corner — redesign Bento completo, Bloco 2 (dados).
--
-- Cobre os itens 1 a 5 da seção 5 do PROMPT-PARA-CLAUDE-CODE.md que ainda
-- não tinham tabela: duração de sessão por passo, tempo por passo
-- configurável (prayer/reading/reflection_minutes), dias da semana
-- escolhidos (weekly_days), e marcação livre de capítulo (chapters_read).
-- Os itens 6 (projeção), 7 (progresso por bloco) e 8 (ordem cronológica)
-- são cálculo puro em JS, sem tabela nova — ver src/plan/readingProjection.js,
-- src/data/metricsBlocks.js e src/data/chronologicalPlan.js (item 8 já
-- existia antes deste bloco, aprovado pela autora sem alteração).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

-- 1) session_seconds — duração de sessão por passo (Oração/Leitura/
-- Reflexão), uma linha por sessão concluída (não um acumulador só). Sem
-- isso, "30b" (tempo por passo), "31a" (tempo da semana) e o "sessão
-- média"/"horário que mais lê" não existem. `user_data.reading_seconds`
-- (migration 0044) continua existindo como atalho de leitura acumulada
-- desde sempre; esta tabela é a fonte granular nova, por dia e por passo —
-- Bloco 3/4 reconecta o cronômetro de leitura pra gravar aqui também.
create table if not exists public.session_seconds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null default (now()::date),
  passo text not null check (passo in ('prayer', 'reading', 'reflection')),
  segundos integer not null check (segundos > 0),
  created_at timestamptz not null default now()
);

alter table public.session_seconds enable row level security;

create index if not exists session_seconds_user_data_idx
  on public.session_seconds (user_id, data);
create index if not exists session_seconds_user_passo_idx
  on public.session_seconds (user_id, passo);

drop policy if exists "usuario ve as proprias sessoes" on public.session_seconds;
create policy "usuario ve as proprias sessoes" on public.session_seconds
  for select using (auth.uid() = user_id);

drop policy if exists "usuario grava as proprias sessoes" on public.session_seconds;
create policy "usuario grava as proprias sessoes" on public.session_seconds
  for insert with check (auth.uid() = user_id);

-- 2) Tempo por passo configurável — hoje só prayer/reflection tinham
-- preferência, e só no aparelho (localStorage, ver src/prayer/
-- prayerDurationStore.js e src/reflection/reflectionDurationStore.js).
-- Migrando pra coluna de conta (sincroniza entre aparelhos, como pede
-- 26d/15f) — 0 desliga o passo, null = "usa o padrão do plano atual"
-- (só relevante hoje pra reading_minutes, que ainda deriva do ritmo
-- Leve/Padrão/Intensivo/Livre; Bloco 4 decide se isso vira 100% manual).
alter table public.user_data
  add column if not exists prayer_minutes integer
    check (prayer_minutes is null or prayer_minutes between 0 and 60);
alter table public.user_data
  add column if not exists reading_minutes integer
    check (reading_minutes is null or reading_minutes between 0 and 60);
alter table public.user_data
  add column if not exists reflection_minutes integer
    check (reflection_minutes is null or reflection_minutes between 0 and 60);

-- 3) Dias da semana escolhidos (27a) — 7 booleanos, índice 0 = segunda,
-- 6 = domingo (mesma convenção de mondayOf() em routineStreak.js). Padrão
-- dias úteis (seg–sex), o atalho mais neutro dos 4 de 27a. weekly_goal_days
-- (migration 0043, um número 3–7) continua existindo — vira derivado
-- (contagem de `true` em weekly_days), mantido em sincronia pelas funções
-- de src/routine/weeklyDaysStore.js, não por trigger, pra não duplicar a
-- lógica que já existe em JS.
alter table public.user_data
  add column if not exists weekly_days boolean[7] not null
    default '{true,true,true,true,true,false,false}';

-- 4) Marcação livre de capítulo (28c) — registro de auditoria de QUEM
-- marcou o quê à mão (fora de uma sessão do plano). A fonte de verdade do
-- progresso continua sendo user_data.completed_keys (ver src/progress/
-- progressStore.js) — marcar manualmente usa as mesmas markKeysDone/
-- markKeysUndone, então automaticamente NÃO mexe em daily_routine nem em
-- streak/weekly_days (são colunas separadas, só tocadas pelo fim de sessão
-- de verdade). Esta tabela é só o traço de origem, pra distinguir na
-- Biblioteca/relatórios o que foi lido de verdade do que foi importado.
create table if not exists public.chapters_read (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  livro text not null,
  capitulo integer not null check (capitulo > 0),
  origem text not null check (origem in ('sessao', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, livro, capitulo)
);

alter table public.chapters_read enable row level security;

create index if not exists chapters_read_user_idx
  on public.chapters_read (user_id);

drop policy if exists "usuario gerencia os proprios capitulos" on public.chapters_read;
create policy "usuario gerencia os proprios capitulos" on public.chapters_read
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
