// Painel do Master — 42b "Alertas" (handoff-admin-42, Bloco 5). As linhas
// são criadas pelo detector (api/detect-master-alerts.js, cron); este
// endpoint só lista e muda estado (visto/arquivado/resolvido) — nunca cria
// alerta na hora de ler, pra não fabricar dado toda vez que a tela abre.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const SEVEN_DAYS_MS = 7 * 86400000

async function list(res) {
  const [{ data: open, error: openErr }, { data: resolved, error: resErr }] = await Promise.all([
    supabaseAdmin.from('master_alerts').select('*').in('status', ['open']).order('created_at', { ascending: false }),
    supabaseAdmin.from('master_alerts').select('*').eq('status', 'resolved').gte('updated_at', new Date(Date.now() - SEVEN_DAYS_MS).toISOString()).order('updated_at', { ascending: false }),
  ])
  if (openErr || resErr) return res.status(500).json({ error: 'query_failed' })

  const map = (r) => ({
    id: r.id, kind: r.kind, title: r.title, detail: r.detail,
    primaryAction: r.primary_action, sourceId: r.source_id, status: r.status,
    seen: !!r.seen_at, createdAt: r.created_at, updatedAt: r.updated_at,
  })

  return res.status(200).json({
    open: (open ?? []).map(map),
    resolved: (resolved ?? []).map(map),
    openCount: (open ?? []).length,
    resolvedThisWeekCount: (resolved ?? []).length,
  })
}

async function decide(req, res, callerId) {
  const { id, decision } = req.body ?? {}
  if (!['archived', 'resolved'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' })
  const { data: alert, error: fetchError } = await supabaseAdmin.from('master_alerts').select('id, kind, title').eq('id', id).maybeSingle()
  if (fetchError || !alert) return res.status(404).json({ error: 'not_found' })

  const { error } = await supabaseAdmin.from('master_alerts').update({ status: decision, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return res.status(500).json({ error: 'update_failed' })

  await supabaseAdmin.from('moderation_actions').insert({
    scope: 'platform', group_id: null, actor_id: callerId, target_user_id: null,
    action: decision === 'archived' ? 'archived_alert' : 'resolved_alert',
    reason: alert.title, source: 'master_alert', source_id: id,
  })
  return res.status(200).json({ ok: true })
}

async function markAllSeen(res) {
  const { error } = await supabaseAdmin.from('master_alerts').update({ seen_at: new Date().toISOString() }).eq('status', 'open').is('seen_at', null)
  if (error) return res.status(500).json({ error: 'update_failed' })
  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const caller = await requireAdmin(req, res)
  if (!caller) return

  const op = req.body?.op
  if (op === 'list') return list(res)
  if (op === 'decide') return decide(req, res, caller.id)
  if (op === 'mark_all_seen') return markAllSeen(res)
  return res.status(400).json({ error: 'invalid_op' })
}
