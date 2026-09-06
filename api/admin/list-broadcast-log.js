// "Enviadas recentemente" (23c) — histórico real de avisos, ver
// admin_broadcast_log (migration 0055). Sem taxa de abertura — não existe
// rastreio disso neste app (ver comentário na migration).
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { data, error } = await supabaseAdmin
    .from('admin_broadcast_log')
    .select('id, segment_label, recipient_count, channels, title, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to list admin broadcast log:', error.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  return res.status(200).json({ log: data ?? [] })
}
