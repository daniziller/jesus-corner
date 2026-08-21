// Busca por tema (IA) nas anotações — complementa a busca por palavra, que
// já é instantânea e client-side (ver NotesScreen.jsx). Chama
// api/search-notes.js, que devolve só as chaves das anotações que se
// relacionam com o tema buscado.
import { supabase } from '../lib/supabaseClient'

export async function searchNotesByTheme(query, notes) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/search-notes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, notes }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.matches
}
