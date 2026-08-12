// Palavras por capítulo de cada livro, lidas do plano 'free' (que sempre
// tem exatamente 1 sessão = 1 capítulo — dado pronto, não precisa
// recalcular nem buscar o texto de novo). Usado por qualquer lugar que
// precise dividir capítulos em sessões por tamanho sem chamar rede: o
// plano cronológico (src/data/chronologicalPlan.js) e o re-cálculo de
// ritmo de um plano por tema já gerado (src/themePlans/chunkThemePassages.js).
import { BIBLE_BLOCKS, SESSIONS_BY_PLAN } from './bibleBlocks.js'

const CHAPTER_WORDS = {}
for (const block of BIBLE_BLOCKS) {
  for (const s of SESSIONS_BY_PLAN.free[block.id]) {
    if (!CHAPTER_WORDS[s.book]) CHAPTER_WORDS[s.book] = []
    CHAPTER_WORDS[s.book][s.chStart - 1] = s.words
  }
}

// Array de palavras por capítulo (índice 0 = capítulo 1) de um livro (nome
// em português, mesma chave usada em SESSIONS_BY_PLAN). Array vazio se o
// nome não bater com nenhum livro canônico.
export function getChapterWords(book) {
  return CHAPTER_WORDS[book] ?? []
}
