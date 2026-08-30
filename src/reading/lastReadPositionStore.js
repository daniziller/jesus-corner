// "Último texto lido" (livro:capítulo) — em QUALQUER modo de leitura:
// navegação livre pela aba Bíblia (mode 'browse') OU fluxo guiado da
// Rotina (mode 'session'). Por dispositivo (localStorage), mesmo padrão de
// lastOpenedChapterStore.js — mas guarda { book, chapter } (independente
// de plano) em vez de { blockId, sessionId }, e serve a outro propósito:
// alimentar o card "Continue sua leitura" da Home, que sempre reabre o
// último capítulo que a pessoa estava lendo (ver findCurrentReadingSession
// em src/App.jsx), não a próxima sessão pendente na ordem do plano.
const KEY = 'jc_last_read_position'

export function getLastReadPosition() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return v && v.book && v.chapter ? v : null
  } catch {
    return null
  }
}

export function setLastReadPosition(book, chapter) {
  if (!book || !chapter) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ book, chapter }))
  } catch {
    // localStorage cheio/indisponível — não é crítico, só perde o "continuar".
  }
}
