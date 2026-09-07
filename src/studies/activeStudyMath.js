// Parte pura de activeStudyStore.js — quando um estudo guiado é ativado,
// ele pausa o plano principal (HANDOFF-35-meu-plano.md, "Estudo ativo pausa
// o plano principal: guardar pausado_em (capítulo) e retorna_em (data
// prevista pelo nº de dias do estudo × dias da semana)"). Testável com
// `node` puro — ver scripts/test-active-study.mjs.
import { dateKey } from '../utils/dateKey.js'

// Data em que o estudo termina (e o plano principal retoma), contando pra
// frente a partir de `from` (exclusive — o dia de ativação não conta como
// já cumprido) até acumular `totalDays` dias marcados no padrão semanal do
// estudo. Sem nenhum dia marcado, cai no dia seguinte (não trava num loop
// infinito à toa).
export function computeStudyResumeDate(from, studyWeekdayPattern, totalDays) {
  const hasAnyDay = Array.isArray(studyWeekdayPattern) && studyWeekdayPattern.some(Boolean)
  const cursor = new Date(from)
  if (!hasAnyDay || totalDays <= 0) {
    cursor.setDate(cursor.getDate() + 1)
    return cursor
  }
  let counted = 0
  while (counted < totalDays) {
    cursor.setDate(cursor.getDate() + 1)
    const weekdayIdx = (cursor.getDay() + 6) % 7 // getDay(): 0=domingo -> índice 6
    if (studyWeekdayPattern[weekdayIdx]) counted++
  }
  cursor.setDate(cursor.getDate() + 1) // o dia seguinte ao último dia de estudo
  return cursor
}

export function resumeDateKey(from, studyWeekdayPattern, totalDays) {
  return dateKey(computeStudyResumeDate(from, studyWeekdayPattern, totalDays))
}
