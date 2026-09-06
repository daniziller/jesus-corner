// Peças puras (sem I/O) do Resumo semanal (31a/31b/31c, Bloco 13) — só a
// parte específica de "uma semana fechada, segunda a domingo" que ainda
// não existia. O resto é reaproveitado direto, sem duplicar:
// mondayOf/isDayGoalMet/computeRecentWeeksStatus (routineStreak.js) pra
// meta/streak de semanas, e totalsByStep/totalsByDay/averageSessionSeconds
// (sessionDurationMath.js) sobre as linhas já filtradas pro intervalo da
// semana. Testado puro (node) em scripts/test-weekly-summary.mjs.
import { dateKey } from '../utils/dateKey.js'
import { isDayGoalMet } from '../routine/routineStreak.js'
import { BIBLE_BLOCKS } from '../data/bibleBlocks.js'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

// Segunda a domingo (chaves YYYY-MM-DD) da semana em que `monday` cai —
// `monday` já deve ser meia-noite de uma segunda-feira (ver mondayOf).
export function weekRangeFor(monday) {
  const end = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return { weekKey: dateKey(monday), startKey: dateKey(monday), endKey: dateKey(end) }
}

// Filtra linhas com coluna `data` (session_seconds/chapters_read-like, mas
// genérico) pro intervalo [startKey, endKey], os dois inclusive.
export function filterByWeek(rows, dateField, startKey, endKey) {
  return rows.filter(r => {
    const v = r[dateField]
    return v && v >= startKey && v <= endKey
  })
}

// 7 booleanos (segunda a domingo) — qual dia bateu a meta (isDayGoalMet)
// dentro da semana de `monday`, mais quantos batem. `today` corta dias
// futuros da semana atual (nunca marca um dia que ainda não chegou).
export function daysMetForWeek(dailyRoutine, monday, today = new Date()) {
  const days = []
  let met = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const done = d <= today && isDayGoalMet(dailyRoutine?.[dateKey(d)])
    days.push(done)
    if (done) met++
  }
  return { days, met }
}

// "Semana em branco" — nenhuma sessão de nenhum passo, nenhum capítulo
// marcado, nenhuma nota escrita. Não gera resumo de IA nem entra no
// histórico (ver send-weekly-digest.js) — item 15 do PROMPT: "semana em
// branco não gera texto motivacional".
export function isBlankWeek({ stepSeconds, chaptersCount, notesCount }) {
  const totalSeconds = (stepSeconds.prayer ?? 0) + (stepSeconds.reading ?? 0) + (stepSeconds.reflection ?? 0)
  return totalSeconds === 0 && chaptersCount === 0 && notesCount === 0
}

// "Gênesis 38 a 41" (um livro só) ou "Gênesis, Êxodo" (mais de um livro na
// semana) — `chapters` é array de {book, capitulo} (mesma forma de
// chapters_read). Usado tanto pelo cron (e-mail, num idioma fixo por
// pessoa) quanto pelas telas (31a/31b) — por isso mora aqui, pura, em vez
// de duplicada em JSX.
export function chaptersRangeLabel(chapters, lang) {
  if (!chapters || chapters.length === 0) return ''
  const byBook = new Map()
  for (const c of chapters) {
    const name = lang === 'en' ? (BOOK_EN_BY_PT[c.book] ?? c.book) : c.book
    if (!byBook.has(name)) byBook.set(name, [])
    byBook.get(name).push(c.capitulo)
  }
  if (byBook.size === 1) {
    const [name, chs] = [...byBook.entries()][0]
    const min = Math.min(...chs), max = Math.max(...chs)
    if (min === max) return `${name} ${min}`
    return lang === 'en' ? `${name} ${min} to ${max}` : `${name} ${min} a ${max}`
  }
  return [...byBook.keys()].join(', ')
}

// "25 a 31 de agosto" (mesmo mês) ou "29 de dez a 4 de jan" (vira o mês) —
// cabeçalho das 3 telas do resumo semanal.
export function weekRangeLabel(startKey, endKey, lang) {
  const [sy, sm, sd] = startKey.split('-').map(Number)
  const [ey, em, ed] = endKey.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const locale = lang === 'en' ? 'en-US' : 'pt-BR'
  if (sy === ey && sm === em) {
    const month = end.toLocaleDateString(locale, { month: 'long' })
    return lang === 'en' ? `${sd}–${ed} ${month}` : `${sd} a ${ed} de ${month}`
  }
  const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const endLabel = end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return lang === 'en' ? `${startLabel} – ${endLabel}` : `${startLabel} a ${endLabel}`
}

// Dia (índice 0=segunda..6=domingo) com mais segundos somados nos 3
// passos, dentro da semana — "dia mais longo" de 31a. `dayTotals` é o
// mapa {data: segundos} que totalsByDay(rows) já devolve.
export function longestDayOf(dayTotals, monday) {
  let best = null
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const seconds = dayTotals[dateKey(d)] ?? 0
    if (seconds > 0 && (!best || seconds > best.seconds)) best = { dayIndex: i, seconds }
  }
  return best
}
