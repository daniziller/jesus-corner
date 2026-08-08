// Lista as mensagens do "Fale Conosco" — a tabela contact_messages não tem
// policy de SELECT nenhuma (ver 0014_contact_messages.sql), então esse
// endpoint (service role) é o único jeito de ler isso fora do dashboard do
// Supabase.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { filter = 'unanswered', limit = 50, offset = 0 } = req.body ?? {}
  const safeLimit = Math.min(Number(limit) || 50, 200)
  const safeOffset = Math.max(Number(offset) || 0, 0)

  let query = supabaseAdmin
    .from('contact_messages')
    .select('id, name, email, message, source, created_at, replied_at, admin_reply')
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1)

  if (filter === 'unanswered') query = query.is('replied_at', null)

  const { data, error } = await query
  if (error) {
    console.error('Failed to list contact messages:', error.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  return res.status(200).json({ messages: data ?? [] })
}
