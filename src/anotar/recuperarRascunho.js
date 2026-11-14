// recuperarRascunho.js — ao abrir o app (e ao abrir a página de
// anotação): se ficou no aparelho um rascunho que não chegou a ser
// gravado na conta — o app foi fechado no meio da escrita —, grava agora.
// Devolve o que a página precisa (as anotações já com o recuperado) e
// `recovered`, o id do que foi recuperado.
import { anotarApi } from './anotarApi'
import { pendingLocalDraft } from './anotarMath.js'

export async function recoverLocalDraft(api = anotarApi) {
  const data = await api.load()
  const local = api.readLocal(data.owner)
  const pending = pendingLocalDraft(local, data.sermonNotes)
  if (!pending) {
    if (local) api.clearLocal(data.owner, local.id)
    return data
  }
  const merged = { ...data, sermonNotes: [pending, ...data.sermonNotes.filter(note => note.id !== pending.id)], recovered: pending.id }
  try {
    await api.save(pending)
    api.clearLocal(data.owner, pending.id)
  } catch (err) {
    // Sem rede: a cópia continua no aparelho e a página abre com ela.
    console.error('[anotar] recuperar rascunho', err)
  }
  return merged
}
