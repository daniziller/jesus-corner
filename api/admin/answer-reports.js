// Lista os reportes de resposta da IA ("Reportar resposta", quadro 10b) —
// a tabela ai_answer_reports só tem policy de SELECT do próprio autor (ver
// migration 0044), então este endpoint (service role) é o único jeito de a
// revisão ler tudo. Traz nome (profiles) e e-mail (auth) de quem reportou,
// pra dar contexto e permitir responder por fora se preciso.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { filter = 'pending', limit = 50, offset = 0 } = req.body ?? {}
  const safeLimit = Math.min(Number(limit) || 50, 200)
  const safeOffset = Math.max(Number(offset) || 0, 0)

  let query = supabaseAdmin
    .from('ai_answer_reports')
    .select('id, user_id, passage_key, lang, tone, question, answer, reason, status, created_at, reviewed_at, reporter:profiles!ai_answer_reports_user_id_fkey(name)')
    .order('created_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1)
  if (filter === 'pending') query = query.eq('status', 'pending')

  const { data, error } = await query
  if (error) {
    console.error('Failed to list answer reports:', error.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  // E-mails via auth admin, um por usuário distinto (poucas dezenas por página).
  const ids = [...new Set((data ?? []).map(r => r.user_id))]
  const emails = {}
  await Promise.all(ids.map(async id => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(id).catch(() => ({ data: null }))
    if (u?.user?.email) emails[id] = u.user.email
  }))

  return res.status(200).json({
    reports: (data ?? []).map(r => ({
      id: r.id,
      userId: r.user_id,
      reporterName: r.reporter?.name ?? '',
      reporterEmail: emails[r.user_id] ?? null,
      passageKey: r.passage_key,
      lang: r.lang,
      tone: r.tone,
      question: r.question,
      answer: r.answer,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
    })),
  })
}
