// Deriva a lista de "textos" de um plano por tema a partir de plan.passages
// (montadas em api/generate-theme-plan.js — já fundidas por livro, uma por
// texto, cada uma com o tempo de leitura calculado). Não existe mais ritmo
// dividindo isso em sessões de tamanho fixo — cada texto é a unidade que a
// pessoa escolhe ler a cada dia (ver PlanScreen.jsx/App.jsx).
//
// Planos gerados antes desse campo `words` existir (passages sem ele) caem
// no fallback: soma a contagem de palavras por capítulo que já existe em
// SESSIONS_BY_PLAN.free (ver src/data/chapterWordCounts.js) — 100% local,
// sem precisar buscar o texto de cada livro de novo pela rede.
import { WORDS_PER_MINUTE, BIBLE_BLOCKS } from '../data/bibleBlocks.js'
import { getChapterWords } from '../data/chapterWordCounts.js'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

function makeText(id, book, chStart, chEnd, reason, words) {
  const bookEn = BOOK_EN_BY_PT[book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  return {
    id, book, bookEn, chStart, chEnd,
    title: `${book} ${range}`, titleEn: `${bookEn} ${range}`,
    passage: `${book} ${range}`, passageEn: `${bookEn} ${range}`,
    reason,
    words,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    status: 'pending',
  }
}

function wordsFor(p) {
  if (p.words != null) return p.words
  const chapterWords = getChapterWords(p.book)
  let words = 0
  for (let ch = p.chStart; ch <= p.chEnd; ch++) words += chapterWords[ch - 1] ?? 0
  return words
}

export function deriveThemeTexts(passages) {
  return (passages ?? []).map((p, i) => makeText(i + 1, p.book, p.chStart, p.chEnd, p.reason, wordsFor(p)))
}

// Chave estável de um texto dentro do plano — usada pra guardar quais
// textos a pessoa escolheu ler hoje (ver src/routine/dailyRoutineStore.js/
// setThemePicks). Não muda enquanto o plano não muda, já que as passagens
// são fixadas na geração e nunca mais re-divididas.
export function themeTextKey(text) {
  return `${text.book}:${text.chStart}-${text.chEnd}`
}
