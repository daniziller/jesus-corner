// Funções puras sobre o mapa de rotina diária — sem I/O, fáceis de testar e
// de reusar tanto no cálculo do streak quanto no calendário da Home.
import { dateKey } from '../utils/dateKey'
import { PLANS } from '../data/bibleBlocks'

// Dias salvos antes da reestruturação em módulos (sem `planId` guardado)
// continuam exigindo os 3 passos, exatamente como sempre exigiram — só dias
// novos (com `planId` gravado por markRoutineStep) passam a ser avaliados
// pelos módulos do plano que estava ativo naquele dia.
const LEGACY_MODULES = ['prayer', 'reading', 'reflection']

function modulesForDay(day) {
  if (!day?.planId) return LEGACY_MODULES
  return PLANS.find(p => p.id === day.planId)?.modules ?? LEGACY_MODULES
}

export function isDayComplete(day) {
  if (!day) return false
  return modulesForDay(day).every(step => !!day[step])
}

// Quantos passos do plano daquele dia foram concluídos — usado pro
// calendário mostrar dias parcialmente concluídos de forma diferente de
// dias vazios.
export function dayStepCount(day) {
  if (!day) return 0
  return modulesForDay(day).filter(step => day[step]).length
}

// Sequência de dias seguidos com os 3 passos completos, terminando hoje.
// Se hoje ainda não terminou os 3 passos, isso não zera a sequência na
// hora — conta a partir de ontem, já que o dia de hoje ainda está "em
// aberto" até acabar.
export function computeRoutineStreak(dailyRoutine, today = new Date()) {
  const cursor = new Date(today)
  if (!isDayComplete(dailyRoutine[dateKey(cursor)])) {
    cursor.setDate(cursor.getDate() - 1)
  }
  let streak = 0
  while (isDayComplete(dailyRoutine[dateKey(cursor)])) {
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
export function computeWeeklyRoutineStats(dailyRoutine, weeksBack = 6, today = new Date()) {
  const currentWeekStart = mondayOf(today)

  const weeks = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart)
    start.setDate(start.getDate() - i * 7)
    const isCurrentWeek = i === 0
    const lastDay = isCurrentWeek ? today : new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)

    let prayerDays = 0, readingDays = 0, reflectionDays = 0, fullDays = 0, totalDays = 0
    for (const d = new Date(start); d <= lastDay; d.setDate(d.getDate() + 1)) {
      totalDays++
      const day = dailyRoutine[dateKey(d)]
      if (day?.prayer) prayerDays++
      if (day?.reading) readingDays++
      if (day?.reflection) reflectionDays++
      if (isDayComplete(day)) fullDays++
    }

    weeks.push({ start, totalDays, prayerDays, readingDays, reflectionDays, fullDays })
  }
  return weeks
}

// Média de dias/semana com a rotina completa (3/3), pras semanas retornadas
// por computeWeeklyRoutineStats — o resumo de "constância" num único número.
export function averageFullRoutineDays(weeks) {
  if (!weeks.length) return 0
  return weeks.reduce((sum, w) => sum + w.fullDays, 0) / weeks.length
}
