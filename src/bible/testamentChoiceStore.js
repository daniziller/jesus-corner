// testamentChoiceStore.js — qual testamento está selecionado na raiz da
// aba Bíblia (handoff-biblia-52 §2: "a escolha é lembrada"). Por aparelho
// (localStorage), como a posição da leitura livre.
const KEY = 'jc_bible_testament'

export function getTestamentChoice() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'at' || v === 'nt' ? v : null
  } catch {
    return null
  }
}

export function setTestamentChoice(id) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // localStorage indisponível — só perde a lembrança, não é crítico.
  }
}
