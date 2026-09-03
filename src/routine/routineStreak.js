// Funções puras sobre o mapa de rotina diária — sem I/O, fáceis de testar e
// de reusar tanto no cálculo do streak quanto no calendário da Home.
import { dateKey } from '../utils/dateKey.js'

// Quais passos avaliar como "a rotina da pessoa" — antes vinha fixo do
// plano de leitura ativo (todo PLANS[i].modules sempre foi o mesmo trio,
// nunca variou de verdade); agora é a escolha independente da pessoa (ver
// session.routineModules/routineModulesStore.js), então essas funções
// recebem `modules` de quem chama em vez de derivar de `day.planId`.
// DEFAULT_ROUTINE_MODULES cobre chamadas sem esse argumento (compatibilidade)
// e dias salvos antes dessa mudança.
export const DEFAULT_ROUTINE_MODULES = ['prayer', 'reading', 'reflection']

export function isDayComplete(day, modules = DEFAULT_ROUTINE_MODULES) {
  if (!day) return false
  return modules.every(step => !!day[step])
}

// Ligar/desligar um passo em "Meu Plano" só vale a partir de hoje — dias já
// passados sempre usam o trio original (DEFAULT_ROUTINE_MODULES), pra não
// reescrever retroativamente se um dia passado foi "completo" ou não (ex:
// ligar "Estudo guiado" não pode derrubar da meta um dia de semana passada
// que já tinha oração+leitura+reflexão feitos, só porque agora "completo"
// também exige estudo). Usado por toda função abaixo que varre dias —
// mesmo critério do RoutineDayRing.jsx/RoutineCalendar.jsx.
export function modulesForDay(dayKeyStr, modules, todayKeyStr) {
  return dayKeyStr >= todayKeyStr ? modules : DEFAULT_ROUTINE_MODULES
}

// Quantos passos do plano daquele dia foram concluídos — usado pro
// calendário mostrar dias parcialmente concluídos de forma diferente de
// dias vazios.
export function dayStepCount(day, modules = DEFAULT_ROUTINE_MODULES) {
  if (!day) return 0
  return modules.filter(step => day[step]).length
}

// Sequência de dias seguidos com todos os passos da rotina completos,
// terminando hoje. Se hoje ainda não terminou, isso não zera a sequência na
// hora — conta a partir de ontem, já que o dia de hoje ainda está "em
// aberto" até acabar.
export function computeRoutineStreak(dailyRoutine, modules = DEFAULT_ROUTINE_MODULES, today = new Date()) {
  const todayKeyStr = dateKey(today)
  const cursor = new Date(today)
  if (!isDayComplete(dailyRoutine[dateKey(cursor)], modulesForDay(dateKey(cursor), modules, todayKeyStr))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (isDayComplete(dailyRoutine[dateKey(cursor)], modulesForDay(dateKey(cursor), modules, todayKeyStr))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Quantas semanas SEGUIDAS (segunda a domingo) a pessoa leu pelo menos 1
// capítulo em pelo menos 1 dia, terminando na semana atual — métrica
// separada do streak diário acima (esse é sobre a rotina INTEIRA, dia a
// dia; este é só sobre leitura, semana a semana, então perdoa um dia sem
// ler contanto que outro dia da mesma semana tenha). Mesmo espírito
// "perdoador" do streak diário: se a semana atual ainda não teve nenhuma
// leitura, isso não zera a sequência na hora — a semana ainda não acabou,
// então começa a contar da semana passada em vez de considerar a atual
// como uma quebra.
export function computeReadingWeekStreak(dailyRoutine, today = new Date()) {
  const todayKeyStr = dateKey(today)
  function weekHasReading(weekStart) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
      const dayKeyStr = dateKey(d)
      if (dayKeyStr > todayKeyStr) break // não olha pra dias futuros da semana atual
      if (dailyRoutine[dayKeyStr]?.reading) return true
    }
    return false
  }
  let cursor = mondayOf(today)
  if (!weekHasReading(cursor)) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
  }
  let weekStreak = 0
  while (weekHasReading(cursor)) {
    weekStreak++
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 7)
  }
  return weekStreak
}

// ── Constância semanal (redesign, etapa 4) ──────────────────────────────
//
// Substitui a sequência de dias corridos por uma meta semanal: a pessoa
// escolhe quantos dias por semana quer se comprometer (weekly_goal_days,
// 3–7, padrão 5 — ver src/routine/weeklyGoalStore.js) e vê "X de 7 dias
// esta semana" + "Y semanas na meta" (contador histórico que só CRESCE,
// nunca reseta por um dia perdido — culpa é o principal motivo de alguém
// desistir de um app devocional). O streak antigo (computeRoutineStreak,
// acima) continua existindo só pelas conquistas/metas de "dias seguidos"
// já publicadas (ver utils/achievements.js/routine/goals.js) — não é mais
// o que a Home/Progresso mostram como "constância".
export const DEFAULT_WEEKLY_GOAL_DAYS = 5

// O dia conta pra meta semanal quando a LEITURA foi concluída — Oração e
// Reflexão somam qualidade, não obrigação (antes exigia os 3 módulos, ver
// isDayComplete). Não depende de routineModules: mesmo quem desligou
// Oração/Reflexão da rotina só precisa ler pra fechar o dia.
export function isDayGoalMet(day) {
  return !!day?.reading
}

// Dias da semana ATUAL (segunda até hoje) que já bateram a meta.
export function computeWeekGoalProgress(dailyRoutine, today = new Date()) {
  const monday = mondayOf(today)
  let daysMet = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    if (d > today) break
    if (isDayGoalMet(dailyRoutine?.[dateKey(d)])) daysMet++
  }
  return daysMet
}

// Quantas semanas, em TODO o histórico, bateram a própria meta semanal —
// contador cumulativo (não uma sequência): uma semana ruim não apaga as
// boas de antes, e a semana atual já soma assim que atinge a meta (dias
// futuros da mesma semana não podem "desfazer" isso). Varre as chaves que
// já existem em dailyRoutine em vez de percorrer calendário — o mapa só
// tem entradas de dias em que algo foi de fato marcado.
export function computeWeeksInGoal(dailyRoutine, weeklyGoalDays = DEFAULT_WEEKLY_GOAL_DAYS, today = new Date()) {
  const todayKeyStr = dateKey(today)
  const metByWeek = new Map() // chave da segunda-feira -> dias com meta batida
  for (const key in dailyRoutine ?? {}) {
    if (key > todayKeyStr || !isDayGoalMet(dailyRoutine[key])) continue
    const [y, m, d] = key.split('-').map(Number)
    const weekKey = dateKey(mondayOf(new Date(y, m - 1, d)))
    metByWeek.set(weekKey, (metByWeek.get(weekKey) ?? 0) + 1)
  }
  let weeks = 0
  for (const count of metByWeek.values()) if (count >= weeklyGoalDays) weeks++
  return weeks
}

// Últimas `weeksBack` semanas (mais antiga primeiro) com o status de cada
// uma em relação à meta — alimenta o gráfico de barras do cartão de
// constância na aba Progresso ("Sua caminhada", redesign 1f/etapa 5). Mesmo
// espírito de computeWeeklyRoutineStats, mas sobre a meta (isDayGoalMet),
// não sobre a rotina inteira — e devolve `met` já pronto (daysMet >=
// weeklyGoalDays), pra quem desenha a barra não precisar repetir a conta.
export function computeRecentWeeksStatus(dailyRoutine, weeklyGoalDays = DEFAULT_WEEKLY_GOAL_DAYS, weeksBack = 9, today = new Date()) {
  const currentWeekStart = mondayOf(today)
  const weeks = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - i * 7)
    const isCurrent = i === 0
    const lastDay = isCurrent ? today : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    let daysMet = 0
    for (const d = new Date(start); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (isDayGoalMet(dailyRoutine?.[dateKey(d)])) daysMet++
    }
    weeks.push({ start, daysMet, met: daysMet >= weeklyGoalDays, isCurrent })
  }
  return weeks
}

// Segunda-feira da semana em que "d" cai (getDay(): 0=domingo..6=sábado) —
// semana sempre começa na segunda, terminando no domingo.
function mondayOf(d) {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Uso semanal dos 3 passos, das `weeksBack` semanas mais recentes (a mais
// antiga primeiro) — vira a métrica de "constância ao longo do tempo" na
// aba Progresso, em número de dias (não %), pra ficar direto: "quantos dias
// você orou essa semana", não uma fração abstrata. Mais granular que uma
// visão mensal — dá pra ver quedas de constância bem mais cedo. A semana
// ainda em andamento conta só até hoje, pra não contar dias futuros que
// ainda nem aconteceram.
export function computeWeeklyRoutineStats(dailyRoutine, modules = DEFAULT_ROUTINE_MODULES, weeksBack = 6, today = new Date()) {
  const currentWeekStart = mondayOf(today)
  const todayKeyStr = dateKey(today)

  const weeks = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart)
    start.setDate(start.getDate() - i * 7)
    const isCurrentWeek = i === 0
    const lastDay = isCurrentWeek ? today : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)

    let prayerDays = 0, readingDays = 0, studyDays = 0, reflectionDays = 0, fullDays = 0, totalDays = 0
    for (const d = new Date(start); d <= lastDay; d.setDate(d.getDate() + 1)) {
      totalDays++
      const dayKeyStr = dateKey(d)
      const day = dailyRoutine[dayKeyStr]
      if (day?.prayer) prayerDays++
      if (day?.reading) readingDays++
      if (day?.study) studyDays++
      if (day?.reflection) reflectionDays++
      if (isDayComplete(day, modulesForDay(dayKeyStr, modules, todayKeyStr))) fullDays++
    }

    weeks.push({ start, totalDays, prayerDays, readingDays, studyDays, reflectionDays, fullDays })
  }
  return weeks
}

// Média de dias/semana com a rotina completa (3/3), pras semanas retornadas
// por computeWeeklyRoutineStats — o resumo de "constância" num único número.
export function averageFullRoutineDays(weeks) {
  if (!weeks.length) return 0
  return weeks.reduce((sum, w) => sum + w.fullDays, 0) / weeks.length
}

// XP de Oração/Reflexão concluídas + bônus por fechar a rotina inteira no
// dia — diferente do XP de leitura (computeGamificationStats, em
// utils/progress.js), que tem um teto natural (a Bíblia acaba), isso NÃO
// tem teto: cresce um pouco a cada dia de uso, pra sempre. Valores baixos
// de propósito (1 capítulo lido = 10 XP; um dia inteiro de rotina, com
// oração+reflexão+bônus, soma 10 também) — rotina não deve valer mais que
// leitura de verdade, só reforçar que ela também conta.
const PRAYER_DAY_XP = 3
const REFLECTION_DAY_XP = 3
const FULL_ROUTINE_DAY_BONUS_XP = 4

export function computeRoutineXpBonus(dailyRoutine, modules = DEFAULT_ROUTINE_MODULES, today = new Date()) {
  const todayKeyStr = dateKey(today)
  let prayerDays = 0, reflectionDays = 0, fullDays = 0
  for (const key in dailyRoutine) {
    const day = dailyRoutine[key]
    if (day?.prayer) prayerDays++
    if (day?.reflection) reflectionDays++
    if (isDayComplete(day, modulesForDay(key, modules, todayKeyStr))) fullDays++
  }
  return prayerDays * PRAYER_DAY_XP + reflectionDays * REFLECTION_DAY_XP + fullDays * FULL_ROUTINE_DAY_BONUS_XP
}
