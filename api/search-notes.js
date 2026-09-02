// Busca por tema (IA) nas anotações pessoais — aba Notas (ver
// src/notes/notesSearchStore.js pro lado client, src/screens/NotesScreen.jsx
// pra UI). Só classifica anotações que o client já tem e já mandou (nunca
// lê a tabela user_data aqui) — bem mais barato que gerar conteúdo novo
// (generate-theme-plan.js/generate-study.js), então sem limite mensal
// persistido; o que protege o custo por chamada é o teto de quantas
// anotações e o tamanho de cada uma (MAX_NOTES/MAX_TEXT_LENGTH abaixo).
import { createClient } from '@supabase/supabase-js'
import { searchNotesByTheme } from './_lib/ai.js'
import { fetchEntitlement } from './_lib/entitlement.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

const MAX_QUERY_LENGTH = 200
const MAX_NOTES = 300
const MAX_TEXT_LENGTH = 600

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const caller = userData.user

  // Recurso de IA — reconfere no servidor (não confia só na trava do
  // client) e exige o tier Premium + IA.
  const ent = await fetchEntitlement(supabase, caller.id)
  if (!ent.hasAI) return res.status(403).json({ error: 'subscription_required' })

  const { query, notes } = req.body ?? {}
  const cleanQuery = (query ?? '').trim()
  if (!cleanQuery || cleanQuery.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: 'invalid_query' })
  }
  if (!Array.isArray(notes) || notes.length === 0) {
    return res.status(400).json({ error: 'invalid_notes' })
  }

  const cleanNotes = notes
    .filter(n => n && typeof n.key === 'string' && typeof n.text === 'string' && n.text.trim())
    .slice(0, MAX_NOTES)
    .map(n => ({ key: n.key, text: n.text.trim().slice(0, MAX_TEXT_LENGTH) }))
  if (cleanNotes.length === 0) {
    return res.status(400).json({ error: 'invalid_notes' })
  }

  let matches
  try {
    matches = await searchNotesByTheme(cleanQuery, cleanNotes)
  } catch (err) {
    console.error('[search-notes] AI call failed:', err.message)
    return res.status(502).json({ error: 'ai_search_failed' })
  }

  // Só devolve chaves que de fato vieram na lista mandada — a IA não pode
  // "inventar" uma chave que não existe.
  const validKeys = new Set(cleanNotes.map(n => n.key))
  const cleanMatches = (matches ?? []).filter(k => validKeys.has(k))

  return res.status(200).json({ ok: true, matches: cleanMatches })
}
