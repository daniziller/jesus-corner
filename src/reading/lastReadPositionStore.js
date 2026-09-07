// "Último texto lido" (livro:capítulo) — em QUALQUER modo de leitura:
// navegação livre pela aba Bíblia (mode 'browse') OU fluxo guiado da
// Rotina (mode 'session'). Por dispositivo (localStorage) — guarda
// { book, chapter } (independente de plano), não { blockId, sessionId }.
// Alimenta o card "Último texto lido" da aba Bíblia (JourneyScreen.jsx) e
// findCurrentReadingSession (src/App.jsx), que reabre o último capítulo
// que a pessoa estava lendo — não a próxima sessão pendente do plano.
const KEY = 'jc_last_read_position'

export function getLastReadPosition() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return v && v.book && v.chapter ? v : null
  } catch {
    return null
  }
}

// readAt (Bloco 3 do redesign, quadro 29a — "Último texto lido, ontem às
// 6:48") — hora em que a posição foi salva, pra Home mostrar quando foi a
// última leitura, não só onde. Registros salvos antes desta mudança não têm
// readAt (getLastReadPosition devolve o objeto assim mesmo; quem lê trata
// null como "hora desconhecida").
export function setLastReadPosition(book, chapter) {
  if (!book || !chapter) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ book, chapter, readAt: new Date().toISOString() }))
  } catch {
    // localStorage cheio/indisponível — não é crítico, só perde o "continuar".
  }
}
