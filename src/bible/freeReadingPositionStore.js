// freeReadingPositionStore.js — "Continuar a leitura livre" (39a, pacote
// 39): onde a pessoa parou especificamente numa leitura LIVRE (39d), com
// o versículo — diferente de reading/lastReadPositionStore.js, que grava
// em QUALQUER modo (guiado OU livre, sem versículo) e alimenta o card do
// Início/findCurrentReadingSession. Os dois continuam sendo gravados em
// paralelo por quem lê livremente (ver BibleReadingScreen.jsx): este é só
// pro cartão novo de 39a, que precisa mostrar uma posição PRÓPRIA da aba
// Bíblia, podendo ser um livro diferente do que o plano está lendo agora
// (é exatamente o exemplo do quadro: plano em Gênesis, leitura livre em
// Salmos). Por dispositivo (localStorage), como o outro.
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
