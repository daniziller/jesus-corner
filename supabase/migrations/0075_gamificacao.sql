-- Jesus' Corner — gamificação (handoff-gamificacao-43-46, turnos 43–46):
-- roda da Bíblia, contador de semanas, conquistas e estante de selos.
--
-- Três colunas novas em user_data e uma em session_seconds; sai a coluna
-- órfã completed_goals (do sistema de Metas apagado em #43 — nenhum
-- leitor nem escritor desde então; confirmado com a autora 2026-11-11).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

-- Conquistas ganhas — { "<id>": { "earnedAt": ISO, "seen": bool,
-- "dateKnown": bool } }. Ids: "{família}:{degrau}" e "bloco:{id}" (ver
-- src/data/achievements.js). Uma vez gravada, nunca removida nem alterada
-- por recálculo — desmarcar capítulo recalcula a roda, não isto.
alter table public.user_data
  add column if not exists achievements jsonb not null default '{}'::jsonb;

-- Selos de livro — { "<Livro>": { "completedAt": ISO, "dateKnown": bool,
-- "readings": n, "reread"?: { "startedAt": ISO, "chapters": [n] } } }.
alter table public.user_data
  add column if not exists book_seals jsonb not null default '{}'::jsonb;

-- Meta semanal vigente por semana — [{ "desde": "YYYY-MM-DD" (segunda),
-- "dias": n }]. weekly_goal_days continua sendo a meta ATUAL; isto é o
-- histórico, pra "semana na meta" usar a meta que valia naquela semana
-- (HANDOFF §3.2: mudar a meta depois não reavalia semanas passadas).
alter table public.user_data
  add column if not exists weekly_goal_history jsonb not null default '[]'::jsonb;

-- Livro aberto numa sessão de leitura — o "Tempo" de um livro terminado
-- (G8/G10). Nulo pra oração/reflexão e pra leituras anteriores a esta
-- migration (a tela esconde o cartão nesse caso, não estima).
alter table public.session_seconds
  add column if not exists livro text;

-- Quando a migração retroativa silenciosa (HANDOFF §7) rodou nesta
-- conta: tudo o que a pessoa já tinha foi gravado como ganho e já visto,
-- sem fila de parabéns. Nulo = ainda não rodou (roda na próxima abertura).
alter table public.user_data
  add column if not exists gamification_migrated_at timestamptz;

alter table public.user_data
  drop column if exists completed_goals;
