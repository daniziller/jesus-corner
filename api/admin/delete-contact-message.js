// Apaga uma mensagem do Fale Conosco (ex: entradas de teste) — sem
// confirmação nenhuma no servidor, a confirmação é responsabilidade do
// client (ver AdminScreen.jsx).
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { id } = req.body ?? {}
  if (!id) return res.status(400).json({ error: 'missing_fields' })

  const { error } = await supabaseAdmin.from('contact_messages').delete().eq('id', id)
  if (error) {
    console.error('Failed to delete contact message:', error.message)
    return res.status(500).json({ error: 'delete_failed' })
  }

  return res.status(200).json({ ok: true })
}
