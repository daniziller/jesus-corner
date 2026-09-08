// bookProgress.js — progresso por livro (39b/39c, pacote 39). Pura, sem
// I/O: recebe completedSet (a fonte de verdade da porcentagem, ver
// manualChapterMarks.js) e o total de capítulos por livro (já existe,
// computeBookChapterCounts em utils/progress.js) — devolve {read, total,
// percent} pra cada um. Não distingue origem (lido no app x marcado à
// mão) — isso é chapterOrigin.js, que responde a uma pergunta diferente
// (de ONDE veio um capítulo já contado aqui).
export function computeBookProgress(bookName, completedSet, total) {
  let read = 0
  for (let ch = 1; ch <= total; ch++) if (completedSet.has(`${bookName}:${ch}`)) read++
  const percent = total ? Math.round((read / total) * 1000) / 10 : 0
  return { read, total, percent }
}

// Todos os livros de uma vez (39b: uma linha por livro) — bookChapterCounts
// vem de computeBookChapterCounts(sessionsByBlock).
export function computeAllBookProgress(completedSet, bookChapterCounts) {
  const out = {}
  for (const book in bookChapterCounts) {
    out[book] = computeBookProgress(book, completedSet, bookChapterCounts[book])
  }
  return out
}

// Testamento inteiro (39a: os dois anéis) — soma read/total de todos os
// livros dos blocos passados (blocks 1–4 = Antigo, 5–8 = Novo, ver
// bibleBlocks.js) usando o MESMO bookChapterCounts, pra nunca divergir do
// que 39b mostra livro a livro.
export function computeTestamentProgress(blocksSubset, completedSet, bookChapterCounts) {
  let read = 0
  let total = 0
  for (const block of blocksSubset) {
    for (const book of block.books) {
      const t = bookChapterCounts[book] ?? 0
      total += t
      read += computeBookProgress(book, completedSet, t).read
    }
  }
  const percent = total ? Math.round((read / total) * 1000) / 10 : 0
  return { read, total, percent }
}
