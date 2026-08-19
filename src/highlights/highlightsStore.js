// Marcações de trechos específicos (versículo a versículo) — guardadas no
// backend (tabela user_data, coluna highlights, um array). Mesmo padrão de
// src/themePlans/themePlansStore.js: wrapper fino sobre fetchRow/updateRow/
// withRowLock de src/backend/userDataStore.js. Mais fino que notesStore.js
// (que é 1 nota por sessão/passagem inteira) — ver comentário em
// supabase/migrations/0032_highlights.sql pro formato de um item.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getHighlights(_email) {
  const row = await fetchRow()
  return Array.isArray(row?.highlights) ? row.highlights : []
}

// Sempre acrescenta (cada marcação tem um id próprio, gerado por quem
// chama — ver ReadingBlockView.jsx) — nunca substitui outra.
export function saveHighlight(_email, highlight) {
  return withRowLock(async () => {
    const current = await getHighlights(_email)
    const next = [...current, highlight]
    const updated = await updateRow({ highlights: next })
    return updated?.highlights ?? next
  })
}

export function updateHighlightText(_email, id, text, color) {
  return withRowLock(async () => {
    const current = await getHighlights(_email)
    const next = current.map(h => h.id === id ? { ...h, text, color: color ?? h.color, updatedAt: new Date().toISOString() } : h)
    const updated = await updateRow({ highlights: next })
    return updated?.highlights ?? next
  })
}

export function deleteHighlight(_email, id) {
  return withRowLock(async () => {
    const current = await getHighlights(_email)
    const next = current.filter(h => h.id !== id)
    const updated = await updateRow({ highlights: next })
    return updated?.highlights ?? next
  })
}
