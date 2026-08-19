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
  const cursor = new Date(today)
  if (!isDayComplete(dailyRoutine[dateKey(cursor)], modules)) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (isDayComplete(dailyRoutine[dateKey(cursor)], modules)) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
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

  const weeks = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart)
    start.setDate(start.getDate() - i * 7)
    const isCurrentWeek = i === 0
    const lastDay = isCurrentWeek ? today : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)

    let prayerDays = 0, readingDays = 0, studyDays = 0, reflectionDays = 0, fullDays = 0, totalDays = 0
    for (const d = new Date(start); d <= lastDay; d.setDate(d.getDate() + 1)) {
      totalDays++
      const day = dailyRoutine[dateKey(d)]
      if (day?.prayer) prayerDays++
      if (day?.reading) readingDays++
      if (day?.study) studyDays++
      if (day?.reflection) reflectionDays++
      if (isDayComplete(day, modules)) fullDays++
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

export function computeRoutineXpBonus(dailyRoutine, modules = DEFAULT_ROUTINE_MODULES) {
  let prayerDays = 0, reflectionDays = 0, fullDays = 0
  for (const key in dailyRoutine) {
    const day = dailyRoutine[key]
    if (day?.prayer) prayerDays++
    if (day?.reflection) reflectionDays++
    if (isDayComplete(day, modules)) fullDays++
  }
  return prayerDays * PRAYER_DAY_XP + reflectionDays * REFLECTION_DAY_XP + fullDays * FULL_ROUTINE_DAY_BONUS_XP
}
