// Meta semanal de constância (redesign, etapa 4) — quantos dias por semana
// a pessoa quer se comprometer a ler (3–7). Guardado no backend (tabela
// user_data, coluna weekly_goal_days — ver migration 0043).
import { fetchRow, updateRow } from '../backend/userDataStore'
import { DEFAULT_WEEKLY_GOAL_DAYS } from './routineStreak'

export async function getWeeklyGoalDays(_email) {
  const row = await fetchRow()
  return row?.weekly_goal_days || DEFAULT_WEEKLY_GOAL_DAYS
}

export async function setWeeklyGoalDays(_email, days) {
  await updateRow({ weekly_goal_days: days })
}
