// Dias da semana por passo (Oração/Leitura/Estudo/Reflexão) — coluna
// step_days (jsonb, migration 0058). Mesmo padrão fino de weeklyDaysStore.js
// sobre fetchRow/updateRow; a parte pura (fallback pro weekly_days de
// sempre, união de dias marcados, meta semanal v2) vive em stepDaysMath.js,
// pra dar pra testar sem sessão — ver scripts/test-step-days.mjs.
import { fetchRow, updateRow } from '../backend/userDataStore'
import { resolveStepDays, STEP_KEYS } from './stepDaysMath'

export { STEP_KEYS, resolveStepDays, stepsScheduledForWeekday, markedWeekdayUnion, countMarkedWeekdays, isStepDayFulfilled, computeStepWeekGoal } from './stepDaysMath'

// { prayer, reading, study, reflection } — cada um um array de 7 booleanos,
// já com o fallback pro weekly_days de sempre aplicado (nunca devolve
// `undefined` pra um passo).
export async function getStepDays() {
  const row = await fetchRow()
  return resolveStepDays(row?.step_days, row?.weekly_days)
}

// Salva um ou mais passos de uma vez — ex: setStepDays({ reading: [...] }).
// Sempre lê o valor salvo primeiro e faz merge raso (não sobrescreve os
// outros passos que a pessoa não tocou agora).
export async function setStepDays(patch) {
  const row = await fetchRow()
  const current = resolveStepDays(row?.step_days, row?.weekly_days)
  const next = { ...current, ...patch }
  for (const step of STEP_KEYS) {
    if (!Array.isArray(next[step]) || next[step].length !== 7) {
      throw new Error(`step_days.${step} precisa ter 7 posições`)
    }
  }
  await updateRow({ step_days: next })
  return next
}
