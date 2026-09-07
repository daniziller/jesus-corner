// Parte pura de stepDaysStore.js (sem I/O) — dias da semana por PASSO
// (Oração/Leitura/Estudo/Reflexão podem cair em dias diferentes, ver
// HANDOFF-35-meu-plano.md "Dias por trilha — regra geral"). Testável com
// `node` puro, sem sessão Supabase — ver scripts/test-step-days.mjs.
//
// Substitui, só para quem já ativou o novo modelo (step_days não nulo),
// a meta semanal antiga de 1 número fixo (weekly_goal_days/isDayGoalMet em
// routineStreak.js) por uma razão: dias cumpridos ÷ dias com ALGO marcado
// (união dos dias de todos os passos ativos) — o mesmo número tem que
// aparecer na grade de 35a, na pílula de 35c e no cartão "Esta semana"
// (HANDOFF, "O que revisar antes de fechar").
import { dateKey } from '../utils/dateKey.js'
import { mondayOf } from './routineStreak.js'

export const STEP_KEYS = ['prayer', 'reading', 'study', 'reflection']

// step_days salvo pode ser nulo, ou faltar alguma chave (conta migrada, ou
// passo novo nunca configurado) — cada passo ausente cai no weekly_days de
// sempre, pra continuar batendo com o que já estava marcado antes deste
// modelo existir.
export function resolveStepDays(stepDays, weeklyDaysFallback) {
  const fallback = Array.isArray(weeklyDaysFallback) && weeklyDaysFallback.length === 7
    ? weeklyDaysFallback
    : [true, true, true, true, true, false, false]
  const resolved = {}
  for (const step of STEP_KEYS) {
    const saved = stepDays?.[step]
    resolved[step] = Array.isArray(saved) && saved.length === 7 ? saved : fallback
  }
  return resolved
}

// Quais passos, entre os ATIVOS (ligados em stepMinutes/routineModules),
// caem no dia de índice `weekdayIndex` (0 = segunda ... 6 = domingo).
export function stepsScheduledForWeekday(resolvedStepDays, activeSteps, weekdayIndex) {
  return activeSteps.filter(step => !!resolvedStepDays[step]?.[weekdayIndex])
}

// 7 booleanos: esse dia da semana tem ALGUM passo ativo marcado (união) —
// mesmo conjunto de dias que a grade "Sua semana" de 35a e o rodapé de 35c
// mostram ("N dias com algo marcado").
export function markedWeekdayUnion(resolvedStepDays, activeSteps) {
  return Array.from({ length: 7 }, (_, i) => stepsScheduledForWeekday(resolvedStepDays, activeSteps, i).length > 0)
}

export function countMarkedWeekdays(resolvedStepDays, activeSteps) {
  return markedWeekdayUnion(resolvedStepDays, activeSteps).filter(Boolean).length
}

// Um dia é "cumprido" quando TODOS os passos agendados pra ele (o que
// stepsScheduledForWeekday devolve) foram concluídos naquele dia
// (dailyRoutine[dateKey]). Dia sem nada marcado nunca é "cumprido" nem
// "perdido" — não entra na conta (é descanso).
export function isStepDayFulfilled(dayRoutineEntry, scheduledSteps) {
  if (scheduledSteps.length === 0) return false
  return scheduledSteps.every(step => !!dayRoutineEntry?.[step])
}

// { doneCount, markedCount } da semana ATUAL (segunda até hoje) — mesma
// fonte pras 3 leituras que o HANDOFF exige que batam (grade 35a, pílula
// 35c, cartão "Esta semana"). markedCount conta a semana inteira (7 dias),
// não só até hoje — é "quantos dias por semana", uma propriedade do plano,
// não um progresso que só cresce ao longo da semana.
export function computeStepWeekGoal(dailyRoutine, resolvedStepDays, activeSteps, today = new Date()) {
  const markedCount = countMarkedWeekdays(resolvedStepDays, activeSteps)
  const monday = mondayOf(today)
  let doneCount = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    if (d > today) break
    const scheduled = stepsScheduledForWeekday(resolvedStepDays, activeSteps, i)
    if (isStepDayFulfilled(dailyRoutine?.[dateKey(d)], scheduled)) doneCount++
  }
  return { doneCount, markedCount }
}
