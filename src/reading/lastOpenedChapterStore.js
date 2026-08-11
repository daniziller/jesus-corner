// Último capítulo aberto na navegação livre pela Bíblia (aba Bíblia,
// mode 'browse' em ReadingBlockView.jsx) — por dispositivo, como
// bibleVersionSelection.js. Não é progresso de verdade (isso já é
// completedSet, salvo no backend); é só "onde a pessoa estava lendo antes
// de sair do app", pro botão "Continuar leitura" em JourneyScreen.jsx.
const KEY = 'jc_last_opened_chapter'

export function getLastOpenedChapter() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function setLastOpenedChapter(blockId, sessionId) {
  localStorage.setItem(KEY, JSON.stringify({ blockId, sessionId }))
}
