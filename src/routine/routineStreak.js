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

// Uso mensal dos 3 passos, dos `monthsBack` meses mais recentes (o mais
// antigo primeiro) — vira a métrica de "constância ao longo do tempo" na
// aba Progresso, em número de dias (não %), pra ficar direto: "quantos dias
// você orou esse mês", não uma fração abstrata. Meses ainda em andamento
// contam só até o dia de hoje, pra não contar dias futuros que ainda nem
// aconteceram.
export function computeMonthlyRoutineStats(dailyRoutine, monthsBack = 6, today = new Date()) {
  const months = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const cursor = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate()

    let prayerDays = 0, readingDays = 0, reflectionDays = 0, fullDays = 0
    for (let day = 1; day <= lastDay; day++) {
      const d = dailyRoutine[dateKey(new Date(year, month, day))]
      if (d?.prayer) prayerDays++
      if (d?.reading) readingDays++
      if (d?.reflection) reflectionDays++
      if (isDayComplete(d)) fullDays++
    }

    months.push({ year, month, totalDays: lastDay, prayerDays, readingDays, reflectionDays, fullDays })
  }
  return months
}

// Média de dias/mês com a rotina completa (3/3), pros meses retornados por
// computeMonthlyRoutineStats — o resumo de "constância" num único número.
export function averageFullRoutineDays(months) {
  if (!months.length) return 0
  return months.reduce((sum, m) => sum + m.fullDays, 0) / months.length
}
