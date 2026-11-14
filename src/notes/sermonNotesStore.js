// Anotações de sermão — registro de sermões ouvidos na igreja (preletor,
// igreja, textos bíblicos lidos, anotação livre), guardado no backend
// (tabela user_data, coluna sermon_notes, um array). Mesmo padrão de
// highlightsStore.js (array de registros com id próprio, não um mapa por
// chave como notesStore.js — cada anotação de sermão é um registro
// independente, sem ligação com uma passagem/dia específico do plano).
import { supabase } from '../lib/supabaseClient'
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export { sermonOwnWordsText, sermonOwnWordCount } from './sermonText.js'

// api/generate-sermon-summary.js — ver ali a verificação por
// palavras-chave antes de devolver.
export async function generateSermonSummaryFor(text, lang) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-sermon-summary', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.summary
}

export async function getSermonNotes(_email) {
  const row = await fetchRow()
  return row?.sermon_notes ?? []
}

// Cria OU atualiza (mesmo id substitui) — quem chama decide o id.
//
// Bug real (achado dela, 2026-09-13: "apertei para finalizar e a
// anotação não salvou na biblioteca"): updateRow() devolve null quando a
// escrita falha (erro do Supabase OU zero linhas afetadas) — mas antes
// isso caía no `?? next`, que devolvia o array otimista MESMO SEM nada
// ter sido salvo de verdade. Quem chamava (finalizeSermonNote em
// JourneyScreen.jsx) nunca via um erro: seguia como se tivesse dado
// certo, limpava o rascunho local e navegava pra Biblioteca — perdendo o
// conteúdo em silêncio. Agora um `updateRow` que falhou vira exceção de
// verdade, pra quem chama poder saber e não fingir sucesso.
export function saveSermonNote(_email, note) {
  return withRowLock(async () => {
    const notes = await getSermonNotes(_email)
    const next = [note, ...notes.filter(n => n.id !== note.id)]
    const updated = await updateRow({ sermon_notes: next })
    if (!updated) throw new Error('sermon_note_save_failed')
    return updated.sermon_notes ?? next
  })
}

export function deleteSermonNote(_email, id) {
  return withRowLock(async () => {
    const notes = await getSermonNotes(_email)
    const next = notes.filter(n => n.id !== id)
    const updated = await updateRow({ sermon_notes: next })
    if (!updated) throw new Error('sermon_note_delete_failed')
    return updated.sermon_notes ?? next
  })
}
