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
// "perdido" — não entra na conta (é descanso). Continua exportada (usada
// em outros lugares/testes) — computeStepWeekGoal/computeWeekPillStates
// agora usam stepSatisfiedDays abaixo, que permite REPOSIÇÃO; esta função
// fica como o cheque simples "esse dia específico, sozinho, bateu?".
export function isStepDayFulfilled(dayRoutineEntry, scheduledSteps) {
  if (scheduledSteps.length === 0) return false
  return scheduledSteps.every(step => !!dayRoutineEntry?.[step])
}

// Pedido dela (2026-09-12): "se a pessoa colocou que o passo tal seria
// feito no dia tal e acabou não fazendo, aparecer pra repor o dia que
// faltou [...] se a pessoa optar por fazer no dia off, marca como feito e
// conta pras métricas da semana." Por PASSO (não pelo dia inteiro,
// trilhas independentes — ver comentário de stepsScheduledForWeekday):
// caminha os dias da semana em ordem; um dia AGENDADO sem o passo feito
// vira um "débito" numa fila (mais antigo primeiro); um dia SEM agenda
// (folga) em que o passo foi feito mesmo assim quita o débito mais antigo
// em aberto — o dia perdido original passa a contar como cumprido dali em
// diante. Não mexe na ordem de leitura nem em nenhum outro dado: só decide
// retroativamente se aquele dia da semana "conta" pra métrica.
// { satisfied: bool[7], pendingMissed: number[] (índices ainda em aberto,
// mais antigo primeiro — o próximo que uma folga futura reporia). }
export function stepSatisfiedDays(oneStepDays, dailyRoutine, step, monday, today = new Date()) {
  const satisfied = new Array(7).fill(false)
  const pendingMissed = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    if (d > today) break
    const done = !!dailyRoutine?.[dateKey(d)]?.[step]
    if (oneStepDays?.[i]) {
      if (done) satisfied[i] = true
      else pendingMissed.push(i)
    } else if (done && pendingMissed.length > 0) {
      satisfied[pendingMissed.shift()] = true
    }
  }
  return { satisfied, pendingMissed }
}

// Dias (índices, mais antigo primeiro) que UM passo específico ainda deve
// da semana atual, como de hoje — usado pra decidir se um dia de folga
// daquele passo mostra "Repor {dia}" em vez do "fora de hoje" de sempre
// (ver planTodayRows.js/HomeScreen.jsx).
export function pendingMakeupWeekdays(oneStepDays, dailyRoutine, step, today = new Date()) {
  return stepSatisfiedDays(oneStepDays, dailyRoutine, step, mondayOf(today), today).pendingMissed
}

// { doneCount, markedCount } da semana ATUAL (segunda até hoje) — mesma
// fonte pras 3 leituras que o HANDOFF exige que batam (grade 35a, pílula
// 35c, cartão "Esta semana"). markedCount conta a semana inteira (7 dias),
// não só até hoje — é "quantos dias por semana", uma propriedade do plano,
// não um progresso que só cresce ao longo da semana. Um dia entra em
// doneCount quando TODOS os passos agendados pra ele estão satisfeitos —
// direto (feito naquele dia) ou por reposição (ver stepSatisfiedDays).
export function computeStepWeekGoal(dailyRoutine, resolvedStepDays, activeSteps, today = new Date()) {
  const markedCount = countMarkedWeekdays(resolvedStepDays, activeSteps)
  const monday = mondayOf(today)
  const satisfiedByStep = {}
  for (const step of activeSteps) {
    satisfiedByStep[step] = stepSatisfiedDays(resolvedStepDays[step], dailyRoutine, step, monday, today).satisfied
  }
  let doneCount = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    if (d > today) break
    const scheduled = stepsScheduledForWeekday(resolvedStepDays, activeSteps, i)
    if (scheduled.length > 0 && scheduled.every(step => satisfiedByStep[step][i])) doneCount++
  }
  return { doneCount, markedCount }
}

// Estado de cada uma das 7 pílulas do cartão "Esta semana" (35a) — 'done'
// (cumprido, direto ou por reposição), 'today' (hoje, ainda não cumprido),
// 'upcoming' (marcado, não cumprido — vale tanto pro futuro quanto pra um
// dia passado perdido: "um dia perdido não zera nada" nunca vira um estado
// visual de culpa, e se for reposto depois vira 'done' igual) e 'rest'
// (nada marcado nesse dia). `done` tem prioridade sobre `today` — se hoje já
// foi cumprido, mostra cumprido, não "ainda hoje".
export function computeWeekPillStates(dailyRoutine, resolvedStepDays, activeSteps, today = new Date()) {
  const monday = mondayOf(today)
  const todayIdx = (today.getDay() + 6) % 7
  const satisfiedByStep = {}
  for (const step of activeSteps) {
    satisfiedByStep[step] = stepSatisfiedDays(resolvedStepDays[step], dailyRoutine, step, monday, today).satisfied
  }
  const states = []
  for (let i = 0; i < 7; i++) {
    const scheduled = stepsScheduledForWeekday(resolvedStepDays, activeSteps, i)
    if (scheduled.length === 0) { states.push('rest'); continue }
    if (scheduled.every(step => satisfiedByStep[step][i])) { states.push('done'); continue }
    states.push(i === todayIdx ? 'today' : 'upcoming')
  }
  return states
}
