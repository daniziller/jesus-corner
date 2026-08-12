// Divide as passagens já validadas de um plano por tema (ver
// api/generate-theme-plan.js, campo `passages`) em sessões de um ritmo
// escolhido — mesmo algoritmo de chunking do endpoint (palavras/minuto),
// só que 100% local: usa a contagem de palavras por capítulo que já existe
// em SESSIONS_BY_PLAN.free (ver src/data/chapterWordCounts.js) em vez de
// buscar o texto de cada livro de novo pela rede. Isso é o que permite
// trocar o ritmo de um plano por tema JÁ GERADO sem chamar a IA de novo —
// as passagens (quais livros/capítulos) não mudam, só o tamanho de cada
// sessão. Usado por App.jsx quando a pessoa muda o ritmo na aba Plano (ver
// PlanScreen.jsx).
import { PLANS, WORDS_PER_MINUTE, BIBLE_BLOCKS } from '../data/bibleBlocks.js'
import { getChapterWords } from '../data/chapterWordCounts.js'

const BOOK_EN_BY_PT = Object.fromEntries(
  BIBLE_BLOCKS.flatMap(b => b.books.map((name, i) => [name, b.booksEn[i]]))
)

function makeSession(id, book, chStart, chEnd, reason) {
  const bookEn = BOOK_EN_BY_PT[book]
  const range = chStart === chEnd ? `${chStart}` : `${chStart}–${chEnd}`
  return {
    id, book, bookEn, chStart, chEnd,
    title: `${book} ${range}`, titleEn: `${bookEn} ${range}`,
    passage: `${book} ${range}`, passageEn: `${bookEn} ${range}`,
    reason,
    status: 'pending',
  }
}

export function chunkThemePassages(passages, paceId) {
  const pace = PLANS.find(p => p.id === paceId) ?? PLANS.find(p => p.id === 'standard')
  // Livre não tem meta de tempo — targetWords 0 faz o chunking abaixo nunca
  // juntar 2 capítulos numa sessão só, resultando em exatamente 1 sessão
  // por capítulo (mesma lógica do cronológico e do endpoint de geração).
  const targetWords = pace.readingMinutes == null ? 0 : pace.readingMinutes * WORDS_PER_MINUTE

  const sessions = []
  let nextId = 1

  for (const p of passages) {
    const chapterWords = getChapterWords(p.book)
    let chunkStart = p.chStart
    let chunkWords = 0
    for (let ch = p.chStart; ch <= p.chEnd; ch++) {
      const w = chapterWords[ch - 1] ?? 0
      if (chunkWords > 0 && chunkWords + w > targetWords) {
        sessions.push(makeSession(nextId++, p.book, chunkStart, ch - 1, p.reason))
        chunkStart = ch
        chunkWords = 0
      }
      chunkWords += w
    }
    sessions.push(makeSession(nextId++, p.book, chunkStart, p.chEnd, p.reason))
  }

  return sessions
}
