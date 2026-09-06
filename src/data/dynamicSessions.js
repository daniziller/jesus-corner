// Divisão de um livro em sessões de ~targetWords cada, capítulo a capítulo,
// sem nunca combinar dois livros na mesma sessão — a mesma heurística
// palavras/minuto de sempre (WORDS_PER_MINUTE), calculada em memória a
// partir da contagem de palavras por capítulo (chapterWordCounts.js), sem
// banco de dados nem IA.
//
// Extraído de chronologicalPlan.js (Bloco 4 do redesign, item 6 da seção 5
// — "reading_minutes vira a fonte real da leitura") pra ser reaproveitado
// por QUALQUER ordem de livros, não só a cronológica: o plano fixo
// (canônico) agora também gera sua divisão em sessões dinamicamente, a
// partir dos minutos reais salvos pela pessoa (ver stepMinutesStore.js e
// buildDynamicSessionsByBlock abaixo), em vez dos 4 ritmos fixos
// (Leve/Padrão/Intensivo — SESSIONS_BY_PLAN em bibleBlocks.js, mantido só
// pelo plano Livre e por compatibilidade de quem ainda não migrou).
import { BIBLE_BLOCKS, WORDS_PER_MINUTE } from './bibleBlocks.js'
import { getChapterWords } from './chapterWordCounts.js'

export const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

export function makeSession(id, book, chStart, chEnd, chapterWords) {
  const bookEn = BOOK_EN_BY_PT[book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  const words = chapterWords.slice(chStart - 1, chEnd).reduce((s, w) => s + w, 0)
  return {
    id, book, bookEn, books: [book],
    title: `${book} ${range}`, titleEn: `${bookEn} ${range}`,
    passage: `${book} ${range}`, passageEn: `${bookEn} ${range}`,
    words, minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    chStart, chEnd,
  }
}

export function makeReflectionSession(id, book) {
  const bookEn = BOOK_EN_BY_PT[book]
  return {
    id, book, bookEn, books: [book],
    title: `Reflexão: ${book}`, titleEn: `Reflection: ${bookEn}`,
    passage: '4 perguntas de reflexão', passageEn: '4 reflection questions',
    words: 0, minutes: 10, type: 'reflection',
  }
}

// targetWords 0 (ex: sem preferência de tempo salva ainda) nunca agrupa 2
// capítulos numa sessão só — a 1ª condição do chunking ("chunkWords > 0") só
// passa depois de já ter fechado o capítulo anterior — resultando em
// exatamente 1 sessão por capítulo, igual ao plano Livre de sempre.
export function buildBookSessions(book, targetWords, startId) {
  const chapterWords = getChapterWords(book)
  const sessions = []
  let id = startId
  let chunkStart = 1
  let chunkWords = 0
  chapterWords.forEach((words, i) => {
    const ch = i + 1
    if (chunkWords > 0 && chunkWords + words > targetWords) {
      sessions.push(makeSession(id++, book, chunkStart, ch - 1, chapterWords))
      chunkStart = ch
      chunkWords = 0
    }
    chunkWords += words
  })
  sessions.push(makeSession(id++, book, chunkStart, chapterWords.length, chapterWords))
  sessions.push(makeReflectionSession(id++, book))
  return { sessions, nextId: id }
}

// Sessões do plano fixo (canônico, os 8 blocos de sempre) divididas pelos
// minutos de leitura REAIS da pessoa (readingMinutesPerDay), em vez dos 4
// ritmos fixos — item 2/6 da seção 5 (Bloco 4, decisão tomada com a
// autora: minutos livres substituem Leve/Padrão/Intensivo como fonte real
// do tamanho da sessão). null/0 cai no comportamento do plano Livre (1
// sessão por capítulo, sem meta de tempo).
export function buildDynamicSessionsByBlock(readingMinutesPerDay) {
  const targetWords = readingMinutesPerDay ? readingMinutesPerDay * WORDS_PER_MINUTE : 0
  const sessionsByBlock = {}
  for (const block of BIBLE_BLOCKS) {
    let nextId = 1
    const sessions = []
    for (const book of block.books) {
      const { sessions: bookSessions, nextId: n } = buildBookSessions(book, targetWords, nextId)
      sessions.push(...bookSessions)
      nextId = n
    }
    sessionsByBlock[block.id] = sessions
  }
  return sessionsByBlock
}
