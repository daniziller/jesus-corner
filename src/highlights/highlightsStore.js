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

// "Apagar" pela interface NUNCA remove o registro de verdade — só marca
// `hidden`, escondendo de toda a UI (ver os filtros `!h.hidden` em quem lê
// highlights). O texto que a pessoa escreveu continua no banco pra
// sempre, só sai de fato se a conta inteira for cancelada (aí a linha de
// user_data inteira é apagada, ver api/delete-account.js — não precisa de
// nenhuma limpeza extra aqui).
export function hideHighlight(_email, id) {
  return withRowLock(async () => {
    const current = await getHighlights(_email)
    const next = current.map(h => h.id === id ? { ...h, hidden: true, hiddenAt: new Date().toISOString() } : h)
    const updated = await updateRow({ highlights: next })
    return updated?.highlights ?? next
  })
}
