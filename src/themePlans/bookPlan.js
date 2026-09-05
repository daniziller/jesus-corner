// bookPlan.js — formato "Livro" do quadro 22a ("capítulo a capítulo").
// Diferente de "Plano temático"/"Tema" (api/generate-theme-plan.js, IA
// escolhe passagens espalhadas pela Bíblia), aqui não tem IA nenhuma: a
// pessoa escolhe UM livro, e o livro inteiro vira o plano, capítulo a
// capítulo, na ordem — dado 100% local (chunkChaptersByWords, o mesmo
// divisor do plano cronológico), sem custo de IA nem chance de a IA errar
// o texto. O resultado é salvo com saveThemePlan como qualquer outro plano
// por tema — dali em diante, "Livro" e "Tema" são o mesmo mecanismo
// (activeAltPlan tipo 'theme', resolveActivePlanSessions, ThemePlanScreen
// pra ler) — só a origem dos `passages` muda.
import { BIBLE_BLOCKS, WORDS_PER_MINUTE, PLANS } from '../data/bibleBlocks'
import { getChapterWords } from '../data/chapterWordCounts'
import { chunkChaptersByWords } from '../utils/wordChunking'

// Achata BIBLE_BLOCKS numa lista única de livros, na ordem canônica —
// mesmo padrão de flattenBooks em JourneyScreen.jsx, mas sem depender do
// progresso (aqui é só a lista pra escolher, não uma grade de leitura).
export function allBooksFlat(lang) {
  return BIBLE_BLOCKS.flatMap(block => {
    const names = lang === 'en' ? block.booksEn : block.books
    return names.map((displayName, i) => ({ displayName, canonicalName: block.books[i], block }))
  })
}

// Tamanho de sessão (quantas palavras por dia) — usa o ritmo 'standard'
// como referência de tamanho, igual ao cronológico e ao mesmo "alvo" que
// api/generate-theme-plan.js usa por padrão pra planos por tema.
const STANDARD_READING_MINUTES = PLANS.find(p => p.id === 'standard')?.readingMinutes ?? 20

export function buildBookPlan(canonicalBook, lang) {
  const entry = allBooksFlat(lang).find(b => b.canonicalName === canonicalBook)
  const displayName = entry?.displayName ?? canonicalBook
  const words = getChapterWords(canonicalBook)
  const chapters = words.map((w, i) => ({ ch: i + 1, words: w }))
  const targetWords = STANDARD_READING_MINUTES * WORDS_PER_MINUTE
  const chunks = chunkChaptersByWords(chapters, targetWords)

  const passages = chunks.map(c => {
    let chWords = 0
    for (let ch = c.chStart; ch <= c.chEnd; ch++) chWords += words[ch - 1] ?? 0
    return { book: canonicalBook, chStart: c.chStart, chEnd: c.chEnd, words: chWords }
    // Sem `reason` — não tem IA aqui pra explicar por que aquele trecho
    // importa; deriveThemeTexts() já tolera reason ausente (ver
    // StudyProposalScreen.jsx, que mostra só a referência nesse caso).
  })

  return {
    id: `book-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: displayName,
    scope: null,
    overview: null,
    format: 'book',
    lang,
    createdAt: new Date().toISOString(),
    passages,
  }
}
