// freeReadingPositionStore.js — "Continuar a leitura livre" (a raiz da aba
// Bíblia, B1, e "Onde você estava" na busca, B5): onde a pessoa parou
// especificamente numa leitura LIVRE (B3), com o versículo — diferente de
// reading/lastReadPositionStore.js, que grava em QUALQUER modo (guiado OU
// livre, sem versículo) e alimenta findCurrentReadingSession. Os dois são
// gravados em paralelo por quem lê livremente (ver ReadingBlockView.jsx):
// este mostra uma posição PRÓPRIA da aba Bíblia, que pode ser um livro
// diferente do que o plano está lendo agora (plano em Gênesis, leitura
// livre em Salmos). Por dispositivo (localStorage), como o outro.
const KEY = 'jc_free_reading_position'

export function getFreeReadingPosition() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return v && v.book && v.chapter ? v : null
  } catch {
    return null
  }
}

export function setFreeReadingPosition(book, bookEn, chapter, verse) {
  if (!book || !chapter) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ book, bookEn, chapter, verse: verse ?? 1, readAt: new Date().toISOString() }))
  } catch {
    // localStorage cheio/indisponível — só perde o "continuar", não é crítico.
  }
}
