// Anotações de sermão — registro de sermões ouvidos na igreja (preletor,
// igreja, textos bíblicos lidos, anotação livre), guardado no backend
// (tabela user_data, coluna sermon_notes, um array). Mesmo padrão de
// highlightsStore.js (array de registros com id próprio, não um mapa por
// chave como notesStore.js — cada anotação de sermão é um registro
// independente, sem ligação com uma passagem/dia específico do plano).
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getSermonNotes(_email) {
  const row = await fetchRow()
  return row?.sermon_notes ?? []
}

// Cria OU atualiza (mesmo id substitui) — quem chama decide o id.
export function saveSermonNote(_email, note) {
  return withRowLock(async () => {
    const notes = await getSermonNotes(_email)
    const next = [note, ...notes.filter(n => n.id !== note.id)]
    const updated = await updateRow({ sermon_notes: next })
    return updated?.sermon_notes ?? next
  })
}

export function deleteSermonNote(_email, id) {
  return withRowLock(async () => {
    const notes = await getSermonNotes(_email)
    const next = notes.filter(n => n.id !== id)
    const updated = await updateRow({ sermon_notes: next })
    return updated?.sermon_notes ?? next
  })
}
