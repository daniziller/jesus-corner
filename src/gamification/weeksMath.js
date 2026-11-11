// weeksMath.js — semanas na meta, cápsulas das últimas 12 semanas e os sete
// dias da semana atual (HANDOFF §3.2 e família Constância). Pura, sem I/O.
//
// Semana = segunda a domingo no fuso do aparelho — a MESMA convenção de
// mondayOf/dateKey que o plano já usa (routine/routineStreak.js,
// utils/dateKey.js); nada de helper novo de data.
//
// "Dia com plano cumprido" = leitura concluída naquele dia (isDayGoalMet,
// a mesma regra que session.weeksInGoal já usava) — Oração e Reflexão
// somam qualidade, não obrigação. Decisão da autora (2026-11-11).
//
// Diferença em relação a computeWeeksInGoal (routineStreak.js): a meta é a
// VIGENTE naquela semana (user_data.weekly_goal_history), não a atual —
// "mudar a meta depois não reavalia semanas passadas" (HANDOFF §3.2/§8).
import { dateKey, parseLocalDateKey } from '../utils/dateKey.js'
import { mondayOf, isDayGoalMet } from '../routine/routineStreak.js'

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Meta que valia na semana que começa em `mondayKey`: a entrada mais
// recente do histórico com `desde` <= segunda daquela semana. Semanas
// anteriores ao primeiro registro usam o primeiro registro (a meta que a
// pessoa tinha quando o histórico começou — a melhor informação que
// existe); sem histórico nenhum, a meta atual.
export function goalForWeek(mondayKey, history, currentGoal) {
  const sorted = [...(history ?? [])].filter(h => h?.desde && h.dias).sort((a, b) => (a.desde < b.desde ? -1 : 1))
  if (sorted.length === 0) return currentGoal
  let goal = sorted[0].dias
  for (const h of sorted) if (h.desde <= mondayKey) goal = h.dias
  return goal
}

// Acrescenta (ou substitui, se já há entrada pra mesma segunda-feira) o
// registro "a partir desta semana a meta é X". Devolve a lista nova.
export function appendGoalHistory(history, dias, today = new Date()) {
  const desde = dateKey(mondayOf(today))
  const rest = (history ?? []).filter(h => h?.desde !== desde)
  return [...rest, { desde, dias }].sort((a, b) => (a.desde < b.desde ? -1 : 1))
}

// Dias com leitura numa semana (segunda `monday`), até `today` inclusive;
// `metOnKey` é o dia em que o `goal`-ésimo dia foi cumprido (a data em que
// aquela semana "entrou na meta", usada como data da conquista).
function weekReadingDays(dailyRoutine, monday, goal, todayKey) {
  const keys = []
  for (let i = 0; i < 7; i++) {
    const key = dateKey(addDays(monday, i))
    if (key > todayKey) break
    if (isDayGoalMet(dailyRoutine?.[key])) keys.push(key)
  }
  return { daysMet: keys.length, metOnKey: keys.length >= goal ? keys[goal - 1] : null }
}

// Todas as semanas (segunda-feira, mais antiga primeiro) que bateram a
// própria meta. Varre só as segundas que têm algum dia marcado no mapa —
// o mapa só tem chaves de dias em que algo foi feito.
export function computeMetWeeks(dailyRoutine, history, currentGoal, today = new Date()) {
  const todayKey = dateKey(today)
  const mondays = new Set()
  for (const key in dailyRoutine ?? {}) {
    if (key > todayKey || !isDayGoalMet(dailyRoutine[key])) continue
    mondays.add(dateKey(mondayOf(parseLocalDateKey(key))))
  }
  const out = []
  for (const mondayKey of [...mondays].sort()) {
    const goal = goalForWeek(mondayKey, history, currentGoal)
    const { daysMet, metOnKey } = weekReadingDays(dailyRoutine, parseLocalDateKey(mondayKey), goal, todayKey)
    if (daysMet >= goal) out.push({ mondayKey, daysMet, goal, metOnKey })
  }
  return out
}

export function computeWeeksInGoal(dailyRoutine, history, currentGoal, today = new Date()) {
  return computeMetWeeks(dailyRoutine, history, currentGoal, today).length
}

// As últimas `n` semanas, mais antiga primeiro, a atual por último —
// as cápsulas de G3. `beforeStart`: a semana inteira é anterior ao
// primeiro registro de atividade da conta (`firstActivityKey`), então o
// lugar existe mas fica transparente — e, numa conta sem nenhum registro
// ainda (`firstActivityKey` nulo), toda semana passada sem dia cumprido
// é anterior ao começo: só a cápsula atual aparece (handoff-hoje-50 §8).
// `fill` (0–1) só na semana atual.
export function computeWeekCapsules(dailyRoutine, history, currentGoal, firstActivityKey, today = new Date(), n = 12) {
  const todayKey = dateKey(today)
  const currentMonday = mondayOf(today)
  const weeks = []
  for (let i = n - 1; i >= 0; i--) {
    const monday = addDays(currentMonday, -7 * i)
    const mondayKey = dateKey(monday)
    const sundayKey = dateKey(addDays(monday, 6))
    const goal = goalForWeek(mondayKey, history, currentGoal)
    const { daysMet } = weekReadingDays(dailyRoutine, monday, goal, todayKey)
    const isCurrent = i === 0
    weeks.push({
      mondayKey, daysMet, goal,
      met: daysMet >= goal,
      isCurrent,
      beforeStart: !isCurrent && (firstActivityKey ? sundayKey < firstActivityKey : daysMet === 0),
      fill: isCurrent ? Math.min(daysMet / goal, 1) : null,
    })
  }
  return weeks
}

// Os sete dias da semana atual (G3, item 5). `weeklyDays`: 7 booleanos,
// segunda=0 (routine/weeklyDaysMath.js). Estados:
//   'leu'      — leitura concluída naquele dia;
//   'hoje'     — hoje (lido ou não; hoje é sempre laranja);
//   'plano'    — dia do plano ainda por vir;
//   'fora'     — dia fora do plano, ou dia do plano que já passou sem
//                leitura (sem vermelho, sem X — igual a fora do plano);
//   'descanso' — domingo fora do plano (no PNG, o domingo tem o contorno
//                claro de descanso e os outros dias fora do plano não).
export function computeWeekDayStates(dailyRoutine, weeklyDays, today = new Date()) {
  const todayKey = dateKey(today)
  const monday = mondayOf(today)
  const days = []
  for (let i = 0; i < 7; i++) {
    const key = dateKey(addDays(monday, i))
    const inPlan = !!weeklyDays?.[i]
    let state
    if (key === todayKey) state = 'hoje'
    else if (isDayGoalMet(dailyRoutine?.[key])) state = 'leu'
    else if (key > todayKey && inPlan) state = 'plano'
    else if (!inPlan && i === 6) state = 'descanso'
    else state = 'fora'
    days.push({ key, state })
  }
  return days
}

// "{feitos} de {meta}" da semana atual — `feitos` pode passar da meta
// ("5 de 4", HANDOFF §8).
export function computeCurrentWeekGoal(dailyRoutine, history, currentGoal, today = new Date()) {
  const mondayKey = dateKey(mondayOf(today))
  const goal = goalForWeek(mondayKey, history, currentGoal)
  const { daysMet } = weekReadingDays(dailyRoutine, mondayOf(today), goal, dateKey(today))
  return { feitos: daysMet, meta: goal, batida: daysMet >= goal }
}
