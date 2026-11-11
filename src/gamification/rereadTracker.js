// rereadTracker.js — aviso de "capítulo aberto na leitura" (HANDOFF §6.3/§8,
// releitura): ReadingBlockView chama notifyChapterOpened ao abrir um
// capítulo na leitura livre; App.jsx escuta e, se aquele livro tem uma
// releitura em andamento (book_seals[livro].reread, ver
// achievementsMath.recordRereadChapter), soma o capítulo ao rastro. Um
// ponto de assinatura minúsculo pra não enfiar mais um prop por duas
// telas que não são desta entrega.
const listeners = new Set()

export function onChapterOpened(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyChapterOpened(book, chapter) {
  for (const fn of listeners) {
    try { fn(book, chapter) } catch (err) { console.error('[releitura] ouvinte', err) }
  }
}
