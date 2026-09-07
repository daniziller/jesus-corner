// "quarta, 10 de setembro" / "Wednesday, September 10" — usado no cartão de
// estudo pausado (35b: "volta quarta, 10 de setembro") e em qualquer outro
// lugar que precise da mesma frase. Recebe uma dateKey (YYYY-MM-DD, ver
// dateKey.js) pra não depender de fuso horário na conversão.
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'

const MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatWeekdayDate(dateKeyStr, lang = 'pt') {
  if (!dateKeyStr) return ''
  const [y, m, d] = dateKeyStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const weekdayIdx = (date.getDay() + 6) % 7 // getDay(): 0=domingo -> índice 6 (mesma convenção de WEEKDAY_FULL)
  const weekday = (WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt)[weekdayIdx]
  const monthName = (lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_PT)[date.getMonth()]
  return lang === 'en' ? `${weekday}, ${monthName} ${d}` : `${weekday}, ${d} de ${monthName}`
}
