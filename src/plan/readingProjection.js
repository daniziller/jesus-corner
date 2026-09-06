// Projeção de término da Bíblia (item 6 da seção 5) — usada em 15f, 27a e
// 26d, recalculando a cada toque. Mesma heurística palavras/minuto que
// src/data/chronologicalPlan.js já usa pra dividir sessões (WORDS_PER_MINUTE
// de src/data/bibleBlocks.js), pra não ter duas contas de "quanto dá pra
// ler" com resultados diferentes dentro do mesmo app.
//
// Recebe capítulos já lidos (o completedSet de sempre), minutos de leitura
// por dia e os dias da semana marcados (array de 7 booleanos, ver
// weeklyDaysStore.js) — e devolve capítulos restantes, meses/anos até
// terminar e a data prevista. Pura, sem I/O: fácil de testar (ver
// scripts/test-reading-projection.mjs) e de chamar direto da UI a cada
// toque no +/− sem esperar rede.
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN, WORDS_PER_MINUTE } from '../data/bibleBlocks.js'
import { sessionKeys } from '../utils/progress.js'

const MONTH_NAMES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

let _allChapterSessions = null
function allChapterSessions() {
  if (_allChapterSessions) return _allChapterSessions
  const sessions = []
  for (const block of BIBLE_BLOCKS) {
    for (const s of SESSIONS_BY_PLAN.free[block.id]) {
      if (s.type !== 'reflection') sessions.push(s)
    }
  }
  _allChapterSessions = sessions
  return sessions
}

export function totalBibleChapters() {
  return allChapterSessions().length
}

// Quantos capítulos de completedSet já foram lidos, restritos a chaves que
// batem com um capítulo de verdade (ignora chaves de reflexão e qualquer
// lixo que não seja "livro:capítulo").
export function countChaptersRead(completedSet) {
  let count = 0
  for (const session of allChapterSessions()) {
    for (const key of sessionKeys(session)) {
      if (completedSet.has(key)) count++
    }
  }
  return count
}

// Palavras restantes = soma de `words` de cada capítulo ainda não lido.
// `words` já vem calculado por capítulo em bibleBlocks.js (mesma fonte que
// chapterWordCounts.js usa), então não recalcula nada, só filtra.
function remainingWords(completedSet) {
  let words = 0
  let chaptersRemaining = 0
  for (const session of allChapterSessions()) {
    // Sessões de bibleBlocks.js podem cobrir mais de 1 capítulo; `words` é
    // o total da sessão, então divide igualmente entre os capítulos dela
    // pra poder contar por capítulo individual (completedSet é por
    // capítulo, não por sessão).
    const chapterCount = session.chEnd - session.chStart + 1
    const wordsPerChapter = session.words / chapterCount
    for (let ch = session.chStart; ch <= session.chEnd; ch++) {
      if (!completedSet.has(`${session.book}:${ch}`)) {
        words += wordsPerChapter
        chaptersRemaining++
      }
    }
  }
  return { words, chaptersRemaining }
}

export function countMarkedDays(weeklyDays) {
  return weeklyDays.filter(Boolean).length
}

// { chaptersRemaining, chaptersPerDay, monthsRemaining, finishDate,
//   finishDateLabel } — readingMinutesPerDay <= 0 devolve null em tudo
// (sem leitura, sem projeção possível; a UI mostra "sem plano" nesse caso).
// `from` é o dia de referência pra calcular a data final (default: agora).
export function computeProjection({ completedSet, readingMinutesPerDay, weeklyDays, lang = 'pt', from = new Date() }) {
  const daysPerWeek = countMarkedDays(weeklyDays)
  if (!readingMinutesPerDay || readingMinutesPerDay <= 0 || daysPerWeek === 0) {
    return { chaptersRemaining: null, chaptersPerDay: null, monthsRemaining: null, finishDate: null, finishDateLabel: null }
  }

  const { words, chaptersRemaining } = remainingWords(completedSet)
  const wordsPerReadingDay = readingMinutesPerDay * WORDS_PER_MINUTE
  const readingDaysNeeded = Math.ceil(words / wordsPerReadingDay)
  const calendarDaysNeeded = Math.ceil((readingDaysNeeded / daysPerWeek) * 7)

  const finishDate = new Date(from)
  finishDate.setDate(finishDate.getDate() + calendarDaysNeeded)

  const monthsRemaining = calendarDaysNeeded / 30.44 // média de dias por mês
  const avgWordsPerChapterRemaining = chaptersRemaining > 0 ? words / chaptersRemaining : 0
  const chaptersPerDay = avgWordsPerChapterRemaining > 0 ? wordsPerReadingDay / avgWordsPerChapterRemaining : 0

  const monthNames = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_PT
  const finishDateLabel = lang === 'en'
    ? `${monthNames[finishDate.getMonth()]} ${finishDate.getFullYear()}`
    : `${monthNames[finishDate.getMonth()]} de ${finishDate.getFullYear()}`

  return {
    chaptersRemaining,
    chaptersPerDay: Math.round(chaptersPerDay * 10) / 10,
    monthsRemaining: Math.round(monthsRemaining),
    finishDate,
    finishDateLabel,
  }
}

// "2 anos e 4 meses" / "2 years and 4 months" — formata monthsRemaining pro
// texto exato que 15f/27a/26d/30b mostram. months <= 0 devolve a versão
// mais curta ("menos de um mês" / "less than a month").
export function formatYearsMonths(months, lang = 'pt') {
  if (months == null || months <= 0) return lang === 'en' ? 'less than a month' : 'menos de um mês'
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (lang === 'en') {
    const yearsPart = years > 0 ? `${years} year${years === 1 ? '' : 's'}` : ''
    const monthsPart = remMonths > 0 ? `${remMonths} month${remMonths === 1 ? '' : 's'}` : ''
    return [yearsPart, monthsPart].filter(Boolean).join(' and ') || 'less than a month'
  }
  const yearsPart = years > 0 ? `${years} ano${years === 1 ? '' : 's'}` : ''
  const monthsPart = remMonths > 0 ? `${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}` : ''
  return [yearsPart, monthsPart].filter(Boolean).join(' e ') || 'menos de um mês'
}
