// relativeDayPeriod.js — "sábado à noite" (39a, "Continuar a leitura
// livre"). Dia (hoje/ontem/dia da semana, mesmo critério de
// continuityDayWord em HomeScreen.jsx) + período do dia (manhã < 12h,
// tarde 12–18h, noite ≥ 18h) a partir de um readAt real — pura, testável
// sem relógio de verdade (recebe `now` pra isso).
import { dateKey } from '../utils/dateKey.js'

function periodOfDay(hour) {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function relativeDayPeriod(isoTimestamp, lang = 'pt', now = new Date()) {
  const readDate = new Date(isoTimestamp)
  const diffDays = Math.round((new Date(dateKey(now)) - new Date(dateKey(readDate))) / 86400000)
  const period = periodOfDay(readDate.getHours())
  let day
  if (diffDays <= 0) day = 'today'
  else if (diffDays === 1) day = 'yesterday'
  else day = readDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long' })
  return { day, period }
}
