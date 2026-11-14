// recuperarRascunho.js — ao abrir o app (e ao abrir a página de
// anotação): se ficou no aparelho um rascunho que não chegou a ser
// gravado na conta — o app foi fechado no meio da escrita —, grava agora.
// Devolve o que a página precisa (as anotações já com o recuperado) e
// `recovered`, o id do que foi recuperado.
import { anotarApi } from './anotarApi'
import { pendingLocalDraft } from './anotarMath.js'
import { pendingLocalNote } from './notaMath.js'

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

// O mesmo para a nota de versículo (N4): o que ficou no aparelho e não
// chegou à conta é gravado agora. Devolve os dados com as marcações já
// atualizadas. Uma recuperação de cada vez: duas ao mesmo tempo (o app
// abrindo e a tela da nota abrindo) criariam a mesma nota duas vezes — a
// segunda espera a primeira e já não encontra a cópia.
let recovering = Promise.resolve()
export function recoverLocalNote(api = anotarApi, loaded = null) {
  const run = async () => {
    const data = loaded ?? await api.load()
    const local = api.readLocalNote(data.owner)
    const pending = pendingLocalNote(local, data.highlights)
    if (!pending) {
      if (local) api.clearLocalNote(data.owner, local.id)
      return data
    }
    const { record } = pending
    try {
      const highlights = pending.action === 'create'
        ? await api.createVerseNote(record)
        : await api.updateVerseNote(record.id, { text: record.text, tags: record.tags })
      api.clearLocalNote(data.owner, record.id)
      return { ...data, highlights: highlights ?? data.highlights, recoveredNote: record.id }
    } catch (err) {
      console.error('[anotar] recuperar nota', err)
      const merged = pending.action === 'create' ? [...data.highlights, record] : data.highlights.map(h => (h.id === record.id ? { ...h, text: record.text, tags: record.tags } : h))
      return { ...data, highlights: merged, recoveredNote: record.id }
    }
  }
  const result = recovering.then(run, run)
  recovering = result.then(() => undefined, () => undefined)
  return result
}
