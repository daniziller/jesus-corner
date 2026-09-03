// Último capítulo aberto na navegação livre pela Bíblia (aba Bíblia,
// mode 'browse' em ReadingBlockView.jsx) — por dispositivo, como
// bibleVersionSelection.js. Não é progresso de verdade (isso já é
// completedSet, salvo no backend); é só "onde a pessoa estava lendo antes
// de sair do app", pro cartão "Última leitura livre" em JourneyScreen.jsx.
// `at` (reskin Bento 5f) é só o carimbo de quando isso foi salvo, pro
// tempo relativo do cartão ("sábado à noite") — um valor salvo antes
// dessa mudança simplesmente não tem `at` (undefined), e quem lê já
// trata isso (sem tempo relativo nesse caso, não quebra).
const KEY = 'jc_last_opened_chapter'

export function getLastOpenedChapter() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function setLastOpenedChapter(blockId, sessionId) {
  localStorage.setItem(KEY, JSON.stringify({ blockId, sessionId, at: new Date().toISOString() }))
}
