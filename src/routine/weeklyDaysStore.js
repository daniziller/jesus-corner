// Dias da semana escolhidos (item 3 da seção 5; tela 27a) — 7 booleanos,
// índice 0 = segunda, 6 = domingo (mesma convenção de mondayOf() em
// routineStreak.js). Substitui o número solto de weekly_goal_days
// (migration 0043) como fonte de verdade de QUAIS dias — "dia marcado é dia
// com aviso, dia em branco é dia livre de culpa" (ADENDO, rodada 27) só faz
// sentido sabendo quais dias são esses, não só quantos.
//
// weekly_goal_days continua na tabela e é mantido em sincronia por esta
// store (não por trigger no banco, pra manter a lógica em um lugar só) —
// assim o código que já lia weekly_goal_days (computeWeeksInGoal,
// computeRecentWeeksStatus em routineStreak.js) continua funcionando sem
// mudança nenhuma.
//
// As constantes e o cálculo puro (sem I/O) vivem em weeklyDaysMath.js, pra
// dar pra testar com `node` puro sem sessão Supabase — ver
// scripts/test-weekly-days.mjs.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { countTrue } from './weeklyDaysMath'
import { appendGoalHistory } from '../gamification/weeksMath'

export { DAY_KEYS, WEEKLY_DAYS_PRESETS, WEEKDAY_ABBR3, WEEKDAY_FULL, countTrue, daysArrayForCount } from './weeklyDaysMath'

const DEFAULT_WEEKLY_DAYS = [true, true, true, true, true, false, false]

export async function getWeeklyDays() {
  const row = await fetchRow()
  return Array.isArray(row?.weekly_days) && row.weekly_days.length === 7
    ? row.weekly_days
    : DEFAULT_WEEKLY_DAYS
}

// Também registra, em user_data.weekly_goal_history (migration 0075), que
// a partir desta semana a meta é countTrue(days) — a gamificação avalia
// cada semana passada pela meta que VALIA nela, nunca pela atual
// ("mudar a meta depois não reavalia semanas passadas", HANDOFF §3.2).
// Dentro do lock porque lê o histórico antes de acrescentar.
export function setWeeklyDays(days) {
  if (!Array.isArray(days) || days.length !== 7) throw new Error('weekly_days precisa ter 7 posições')
  return withRowLock(async () => {
    const row = await fetchRow()
    const dias = countTrue(days)
    const history = appendGoalHistory(Array.isArray(row?.weekly_goal_history) ? row.weekly_goal_history : [], dias)
    await updateRow({ weekly_days: days, weekly_goal_days: dias, weekly_goal_history: history })
  })
}
