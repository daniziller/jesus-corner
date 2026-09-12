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
//
// Leitura e Estudo são 100% independentes um do outro (confirmado com a
// autora, 2026-09-09) — o único critério pra cada um cair num dia é o
// próprio calendário desse passo (Ajustar meu plano); os dois podem
// coexistir no mesmo dia sem problema nenhum, virando 4 passos naquele
// dia. Turno 41 (41f "Nos dias de estudo") tinha introduzido um modo
// "substituir" que tirava a Leitura nos dias em que os dois coincidiam —
// revertido: não existe esse cruzamento, cada passo só olha pro próprio
// stepDays.
export function stepsScheduledForWeekday(resolvedStepDays, activeSteps, weekdayIndex) {
  return activeSteps.filter(step => !!resolvedStepDays[step]?.[weekdayIndex])
}

// 7 booleanos: esse dia da semana tem ALGUM passo ativo marcado (união) —
// mesmo conjunto de dias que a grade "Sua semana" de 35a e o rodapé de 35c
// mostram ("N dias com algo marcado").
export function markedWeekdayUnion(resolvedStepDays, activeSteps) {
  return Array.from({ length: 7 }, (_, i) => stepsScheduledForWeekday(resolvedStepDays, activeSteps, i).length > 0)
}

// Próximo dia da semana (a partir de AMANHÃ, dando a volta) em que um único
// passo específico (ex: `stepDays.reading`) está marcado — "Volta quinta ·
// Gênesis 43" no tile "off" de 34c (Hoje, Bloco 4): quando Leitura não cai
// hoje (substituída pelo Estudo, ou só desligada nesse dia), o tile precisa
// dizer QUANDO ela volta. null se o passo não tem nenhum dia marcado (a
// pessoa desligou esse passo de vez de todos os dias — não deveria
// acontecer com um passo ativo, mas mais seguro que um índice inválido).
export function nextScheduledWeekday(oneStepDays, fromWeekdayIndex) {
  for (let step = 1; step <= 7; step++) {
    const idx = (fromWeekdayIndex + step) % 7
    if (oneStepDays?.[idx]) return idx
  }
  return null
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

// Estado de cada uma das 7 pílulas do cartão "Esta semana" (35a) — 'done'
// (cumprido), 'today' (hoje, ainda não cumprido), 'upcoming' (marcado, não
// cumprido — vale tanto pro futuro quanto pra um dia passado perdido: "um
// dia perdido não zera nada" nunca vira um estado visual de culpa) e 'rest'
// (nada marcado nesse dia). `done` tem prioridade sobre `today` — se hoje já
// foi cumprido, mostra cumprido, não "ainda hoje".
export function computeWeekPillStates(dailyRoutine, resolvedStepDays, activeSteps, today = new Date()) {
  const monday = mondayOf(today)
  const todayIdx = (today.getDay() + 6) % 7
  const states = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const scheduled = stepsScheduledForWeekday(resolvedStepDays, activeSteps, i)
    if (scheduled.length === 0) { states.push('rest'); continue }
    if (isStepDayFulfilled(dailyRoutine?.[dateKey(d)], scheduled)) { states.push('done'); continue }
    states.push(i === todayIdx ? 'today' : 'upcoming')
  }
  return states
}
