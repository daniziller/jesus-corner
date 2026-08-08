// Lista os grupos de leitura (id + nome) pro seletor de segmento do Aviso
// geral — "mandar só pros membros do grupo X".
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { data, error } = await supabaseAdmin.from('reading_groups').select('id, name').order('name')
  if (error) {
    console.error('Failed to list reading groups:', error.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  return res.status(200).json({ groups: data ?? [] })
}
