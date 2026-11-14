// rascunhoLocal.js — a cópia do rascunho no aparelho. Gravar na conta
// leva duas idas à rede; se o app é fechado no meio da escrita, a última
// frase pode não ter chegado lá. Por isso cada mudança fica também aqui,
// na hora, e sai assim que a gravação na conta confirma. Ao reabrir, o
// que sobrou aqui é o que ainda não tinha sido gravado (ver
// recuperarRascunho.js). Uma cópia por conta — nunca atravessa contas.
const KEY = 'jc_note_draft_backup'
const keyOf = owner => `${KEY}:${owner ?? 'guest'}`

export function keepLocalDraft(owner, note) {
  try { window.localStorage.setItem(keyOf(owner), JSON.stringify(note)) } catch { /* sem espaço ou modo privado: fica só a gravação na conta */ }
}

export function readLocalDraft(owner) {
  try {
    const note = JSON.parse(window.localStorage.getItem(keyOf(owner)) ?? 'null')
    return note && typeof note === 'object' && note.id ? note : null
  } catch { return null }
}

// Só tira a cópia se ainda for a daquela anotação.
export function clearLocalDraft(owner, id) {
  try { if (readLocalDraft(owner)?.id === id) window.localStorage.removeItem(keyOf(owner)) } catch { /* nada a fazer */ }
}
