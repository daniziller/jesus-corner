-- Jesus' Corner — meta semanal de constância (redesign, etapa 4).
--
-- Substitui a sequência de dias corridos por uma meta semanal: a pessoa
-- escolhe quantos dias por semana quer se comprometer (3–7, padrão 5) e
-- vê "X de 7 dias esta semana" + "Y semanas na meta" — um contador que só
-- cresce, nunca reseta por um dia perdido. Ver src/routine/weeklyGoalStore.js
-- e src/routine/routineStreak.js (computeWeekGoalProgress/computeWeeksInGoal).
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- Seguro rodar mais de uma vez (idempotente).

alter table public.user_data
  add column if not exists weekly_goal_days integer not null default 5
    check (weekly_goal_days between 3 and 7);
