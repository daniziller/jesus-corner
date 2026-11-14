// rascunhoLocal.js — a cópia, no aparelho, do que está sendo escrito: o
// rascunho da anotação (N2) e a nota de versículo (N4). Gravar na conta
// leva duas idas à rede; se o app é fechado no meio da escrita, a última
// frase pode não ter chegado lá. Por isso cada mudança fica também aqui,
// na hora, e sai assim que a gravação na conta confirma. Ao reabrir, o
// que sobrou aqui é o que ainda não tinha sido gravado (ver
// recuperarRascunho.js). Uma cópia por conta — nunca atravessa contas.
function localCopy(name) {
  const keyOf = owner => `${name}:${owner ?? 'guest'}`
  const read = owner => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(keyOf(owner)) ?? 'null')
      return saved && typeof saved === 'object' && saved.id ? saved : null
    } catch { return null }
  }
  return {
    keep(owner, record) {
      try { window.localStorage.setItem(keyOf(owner), JSON.stringify(record)) } catch { /* sem espaço ou modo privado: fica só a gravação na conta */ }
    },
    read,
    // Só tira a cópia se ainda for a daquele registro.
    clear(owner, id) {
      try { if (read(owner)?.id === id) window.localStorage.removeItem(keyOf(owner)) } catch { /* nada a fazer */ }
    },
  }
}

const draft = localCopy('jc_note_draft_backup')
export const keepLocalDraft = draft.keep
export const readLocalDraft = draft.read
export const clearLocalDraft = draft.clear

const verseNote = localCopy('jc_verse_note_backup')
export const keepLocalNote = verseNote.keep
export const readLocalNote = verseNote.read
export const clearLocalNote = verseNote.clear
