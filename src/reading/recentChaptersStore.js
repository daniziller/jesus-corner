// Últimos capítulos abertos na navegação livre pela Bíblia (mode 'browse'
// em ReadingBlockView.jsx) — por dispositivo, mesmo padrão de
// lastOpenedChapterStore.js, mas guarda uma LISTA (mais recente primeiro,
// sem repetir capítulo), não só o último. Alimenta os cards estilo
// "stories" pra voltar rápido a um dos últimos lidos, tanto na tela
// inicial da aba Bíblia (JourneyScreen.jsx) quanto dentro de um livro já
// aberto (ReadingBlockView.jsx).
const KEY = 'jc_recent_chapters'
const MAX = 4

export function getRecentChapters() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// entry: { blockId, sessionId, book, bookEn, chapter }
export function addRecentChapter(entry) {
  const key = `${entry.book}:${entry.chapter}`
  const rest = getRecentChapters().filter(e => `${e.book}:${e.chapter}` !== key)
  const next = [entry, ...rest].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
