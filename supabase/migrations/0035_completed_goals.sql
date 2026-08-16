-- Jesus' Corner — metas de constância da rotina (não confundir com
-- "Desafios", que já é o nome usado pros desafios de leitura em GRUPO na
-- aba Comunidade — ver reading_challenges/0002_friends_groups_challenges).
--
-- Metas são pessoais: variações de "complete a rotina (Oração + Leitura +
-- Reflexão) em X dias" — ver src/routine/goals.js pros critérios e
-- src/routine/goalsStore.js pra leitura/escrita. Uma vez batida, a meta
-- fica registrada aqui pra sempre (mesmo que o streak quebre depois) — sem
-- isso, o selo sumiria de novo, já que streak/janela são recalculados a
-- cada render a partir de daily_routine.
--
-- Formato: { "streak-7": { "completedAt": "2026-08-16T14:03:00.000Z" } }
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists completed_goals jsonb not null default '{}'::jsonb;
