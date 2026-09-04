// Marca um reporte de resposta como revisado ou descartado (ver
// api/admin/answer-reports.js). Só muda o status — o reporte fica guardado
// como histórico do que a IA respondeu e de quando foi revisto.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const STATUSES = ['pending', 'reviewed', 'dismissed']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { id, status } = req.body ?? {}
  if (!id || !STATUSES.includes(status)) return res.status(400).json({ error: 'missing_fields' })

  const { error } = await supabaseAdmin
    .from('ai_answer_reports')
    .update({ status, reviewed_at: status === 'pending' ? null : new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error('Failed to update answer report:', error.message)
    return res.status(500).json({ error: 'update_failed' })
  }
  return res.status(200).json({ ok: true })
}
