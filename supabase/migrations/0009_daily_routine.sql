-- Jesus' Corner — rotina diária (Oração, Leitura, Reflexão) e o novo
-- streak baseado em hábito, não em login.
--
-- As colunas antigas `streak`/`last_login_at` continuam na tabela (não são
-- removidas, pra não ser uma migração destrutiva), mas o app para de
-- lê-las/escrevê-las a partir desta versão — o streak exibido agora é
-- calculado no client a partir de `daily_routine` (ver
-- src/routine/routineStreak.js), contando só dias em que os três passos
-- foram marcados como concluídos.
--
-- Formato de daily_routine: { "2026-07-09": { "prayer": true, "reading":
-- true, "reflection": true } } — um dia só "conta" pro streak quando as
-- três chaves estão true; dias parciais ficam só com as chaves que já
-- foram concluídas.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists daily_routine jsonb not null default '{}'::jsonb;
