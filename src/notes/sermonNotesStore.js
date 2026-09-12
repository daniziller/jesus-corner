// Anotações de sermão — registro de sermões ouvidos na igreja (preletor,
// igreja, textos bíblicos lidos, anotação livre), guardado no backend
// (tabela user_data, coluna sermon_notes, um array). Mesmo padrão de
// highlightsStore.js (array de registros com id próprio, não um mapa por
// chave como notesStore.js — cada anotação de sermão é um registro
// independente, sem ligação com uma passagem/dia específico do plano).
import { supabase } from '../lib/supabaseClient'
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

// "Só as palavras dela" (34h, Regra 4 §10) — junta os segmentos de TEXTO
// e TÓPICO do corpo estruturado (turno 34, Bloco 3), pulando os blocos
// de CITAÇÃO (texto bíblico, não anotação) e de LINK (correção
// 2026-09-09 — só a referência, sem texto próprio nenhum). Compat com
// quem só usou a área simples de 34d (sem body nenhum): usa `text` direto.
export function sermonOwnWordsText(draft) {
  if (Array.isArray(draft?.body) && draft.body.length > 0) {
    return draft.body.filter(s => s.type !== 'quote' && s.type !== 'link').map(s => s.text ?? '').filter(Boolean).join('\n\n')
  }
  return draft?.text ?? ''
}

// "Com menos de ~40 palavras escritas, o bloco preto não aparece" (34h,
// estado de anotação curta) — mesmo texto de sermonOwnWordsText, só a
// contagem.
export function sermonOwnWordCount(draft) {
  return sermonOwnWordsText(draft).trim().split(/\s+/).filter(Boolean).length
}

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
