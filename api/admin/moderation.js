// Painel do Master — 42f "Moderação" (handoff-admin-42, Bloco 4). Fila
// encadeada unindo TRÊS origens (Regra 6.12: "respostas reportadas da IA
// usam o mesmo cartão"): group_message_reports escaladas (24h sem decisão
// do admin do grupo, ver migration 0065), admin_reports diretos (42o,
// migration 0067) e ai_answer_reports (já existia, ver
// api/admin/answer-reports.js). Master age em QUALQUER grupo — por isso
// tudo aqui usa o service role direto (bypassa is_group_moderator de
// propósito), nunca as RPCs dos Blocos 1-3, que são group-scoped.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function listQueue(res) {
  const [msgReports, adminReports, aiReports, resolvedMsg, resolvedAdmin] = await Promise.all([
    supabaseAdmin
      .from('group_message_reports')
      .select('id, group_id, message_kind, message_id, message_snapshot, reported_user_id, reporter_id, reason, status, created_at, group:reading_groups!group_message_reports_group_id_fkey(name), reported:profiles!group_message_reports_reported_user_id_fkey(name)')
      .in('status', ['escalated'])
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('admin_reports')
      .select('id, group_id, category, body, attached_user_id, status, created_at, group:reading_groups!admin_reports_group_id_fkey(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('ai_answer_reports')
      .select('id, question, answer, reason, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('group_message_reports')
      .select('id, group_id, decision, decided_at, created_at, group:reading_groups!group_message_reports_group_id_fkey(name), reported:profiles!group_message_reports_reported_user_id_fkey(name)')
      .eq('status', 'resolved')
      .order('decided_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('admin_reports')
      .select('id, group_id, category, group:reading_groups!admin_reports_group_id_fkey(name)')
      .eq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  if (msgReports.error || adminReports.error || aiReports.error) {
    console.error('[admin/moderation] queue query failed', msgReports.error ?? adminReports.error ?? aiReports.error)
    return res.status(500).json({ error: 'query_failed' })
  }

  const resolved = [
    ...(resolvedMsg.data ?? []).map(r => ({ kind: 'message_report', id: r.id, groupName: r.group?.name ?? '', personName: r.reported?.name ?? '', decision: r.decision, decidedAt: r.decided_at })),
    ...(resolvedAdmin.data ?? []).map(r => ({ kind: 'admin_report', id: r.id, groupName: r.group?.name ?? '', category: r.category })),
  ]

  // Contagem de denúncias por mensagem (mesma message_id) — "3 denúncias"
  // no cartão da fila.
  const counts = {}
  for (const r of msgReports.data ?? []) counts[r.message_id] = (counts[r.message_id] ?? 0) + 1

  const queue = [
    ...(msgReports.data ?? []).map(r => ({
      kind: 'message_report', id: r.id, groupId: r.group_id, groupName: r.group?.name ?? '',
      reportedName: r.reported?.name ?? '', reason: r.reason, reportCount: counts[r.message_id] ?? 1,
      messageSnapshot: r.message_snapshot, escalated: true, createdAt: r.created_at,
    })),
    ...(adminReports.data ?? []).map(r => ({
      kind: 'admin_report', id: r.id, groupId: r.group_id, groupName: r.group?.name ?? '',
      category: r.category, body: r.body, escalated: false, createdAt: r.created_at,
    })),
    ...(aiReports.data ?? []).map(r => ({
      kind: 'ai_answer', id: r.id, question: r.question, answer: r.answer, reason: r.reason,
      escalated: false, createdAt: r.created_at,
    })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const responseHours = (resolvedMsg.data ?? [])
    .filter(r => r.decided_at)
    .map(r => (new Date(r.decided_at).getTime() - new Date(r.created_at).getTime()) / 3600000)
  const avgResponseHours = responseHours.length > 0 ? Math.round(responseHours.reduce((a, b) => a + b, 0) / responseHours.length) : null

  return res.status(200).json({
    queue,
    resolved,
    escalatedCount: (msgReports.data ?? []).length,
    aiCount: (aiReports.data ?? []).length,
    avgResponseHours,
  })
}

async function getCase(res, kind, id) {
  if (kind === 'message_report') {
    const { data: r, error } = await supabaseAdmin
      .from('group_message_reports')
      .select(`
        id, group_id, message_kind, message_id, message_snapshot, reason, reason_detail, created_at,
        reported_user_id, reporter_id,
        group:reading_groups!group_message_reports_group_id_fkey(name),
        reported:profiles!group_message_reports_reported_user_id_fkey(name),
        reporter:profiles!group_message_reports_reporter_id_fkey(name)
      `)
      .eq('id', id)
      .maybeSingle()
    if (error || !r) return res.status(404).json({ error: 'not_found' })

    const [priorCount, adminRow, sameMessageReports, subRow, groupsCountRes, reports30dRes] = await Promise.all([
      supabaseAdmin.from('group_message_reports').select('id', { count: 'exact', head: true }).eq('group_id', r.group_id).eq('reported_user_id', r.reported_user_id).neq('id', id),
      supabaseAdmin.from('reading_group_members').select('user_id, member:profiles!reading_group_members_user_id_fkey(name)').eq('group_id', r.group_id).eq('role', 'moderator').limit(1).maybeSingle(),
      // Denúncias contra a MESMA mensagem (não só o mesmo autor) — a
      // quebra por motivo do quadro 42c ("3 DENÚNCIAS · Cobrança de
      // dinheiro 2 · Constrangimento a membros 1") é por mensagem, não por
      // pessoa.
      supabaseAdmin.from('group_message_reports').select('reason').eq('message_id', r.message_id),
      supabaseAdmin.from('subscriptions').select('created_at').eq('user_id', r.reported_user_id).maybeSingle(),
      supabaseAdmin.from('reading_group_members').select('id', { count: 'exact', head: true }).eq('user_id', r.reported_user_id).eq('status', 'joined'),
      // "2ª denúncia em 30 dias" (histórico) — contra a PESSOA, em
      // qualquer grupo, últimos 30 dias, incluindo esta.
      supabaseAdmin.from('group_message_reports').select('id', { count: 'exact', head: true }).eq('reported_user_id', r.reported_user_id).gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    ])
    const reasonCounts = {}
    for (const row of sameMessageReports.data ?? []) reasonCounts[row.reason] = (reasonCounts[row.reason] ?? 0) + 1
    const reasonBreakdown = Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)

    // Contexto: as mensagens vizinhas no mesmo mural (group_comments), 1
    // antes e 1 depois da denunciada, pra não julgar a mensagem isolada
    // (Regra: "a mensagem isolada engana").
    let context = []
    if (r.message_kind === 'comment') {
      const { data: rows } = await supabaseAdmin
        .from('group_comments')
        .select('id, body, created_at, author:profiles!group_comments_user_id_fkey(name)')
        .eq('group_id', r.group_id)
        .order('created_at', { ascending: true })
      const idx = (rows ?? []).findIndex(c => c.id === r.message_id)
      if (idx !== -1) context = (rows ?? []).slice(Math.max(0, idx - 1), idx + 2)
    }

    return res.status(200).json({
      kind: 'message_report', id: r.id, groupId: r.group_id, groupName: r.group?.name ?? '',
      reportedUserId: r.reported_user_id, reportedName: r.reported?.name ?? '',
      reporterName: r.reporter?.name ?? '', reason: r.reason, reasonDetail: r.reason_detail,
      messageSnapshot: r.message_snapshot, createdAt: r.created_at,
      priorReportsCount: priorCount.count ?? 0,
      groupModeratorName: adminRow.data?.member?.name ?? '',
      context: context.map(c => ({ id: c.id, name: c.author?.name ?? '', body: c.body, createdAt: c.created_at, isReported: c.id === r.message_id })),
      reasonBreakdown, reportCount: (sameMessageReports.data ?? []).length,
      subscriberSince: subRow.data?.created_at ?? null,
      groupsCount: groupsCountRes.count ?? 0,
      reportsIn30Days: reports30dRes.count ?? 0,
    })
  }

  if (kind === 'admin_report') {
    const { data: r, error } = await supabaseAdmin
      .from('admin_reports')
      .select('id, group_id, category, body, attached_user_id, attached_message_ids, created_at, group:reading_groups!admin_reports_group_id_fkey(name), attached:profiles!admin_reports_attached_user_id_fkey(name)')
      .eq('id', id)
      .maybeSingle()
    if (error || !r) return res.status(404).json({ error: 'not_found' })
    return res.status(200).json({
      kind: 'admin_report', id: r.id, groupId: r.group_id, groupName: r.group?.name ?? '',
      category: r.category, body: r.body, attachedName: r.attached?.name ?? null, createdAt: r.created_at,
    })
  }

  if (kind === 'ai_answer') {
    const { data: r, error } = await supabaseAdmin
      .from('ai_answer_reports')
      .select('id, question, answer, reason, passage_key, created_at')
      .eq('id', id)
      .maybeSingle()
    if (error || !r) return res.status(404).json({ error: 'not_found' })
    return res.status(200).json({ kind: 'ai_answer', id: r.id, question: r.question, answer: r.answer, reason: r.reason, passageKey: r.passage_key, createdAt: r.created_at })
  }

  return res.status(400).json({ error: 'invalid_kind' })
}

// decision: 'deleted_message' | 'muted_user' | 'blocked_account' | 'archived'
// (mesmas 4 ações de 42c, agora do Master — "Bloquear conta" só existe
// aqui, nunca nas RPCs de admin de grupo).
async function decideCase(req, res, callerId) {
  const { kind, id, decision, reason } = req.body ?? {}
  if (!['message_report', 'admin_report', 'ai_answer'].includes(kind)) return res.status(400).json({ error: 'invalid_kind' })
  if (!['deleted_message', 'muted_user', 'blocked_account', 'archived'].includes(decision)) return res.status(400).json({ error: 'invalid_decision' })
  if (decision !== 'archived' && !(reason ?? '').trim()) return res.status(400).json({ error: 'reason_required' })

  if (kind === 'ai_answer') {
    const { error } = await supabaseAdmin.from('ai_answer_reports').update({ status: decision === 'archived' ? 'dismissed' : 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', id)
    if (error) return res.status(500).json({ error: 'update_failed' })
    return res.status(200).json({ ok: true })
  }

  const table = kind === 'message_report' ? 'group_message_reports' : 'admin_reports'
  const { data: caseRow, error: fetchError } = await supabaseAdmin.from(table).select('*').eq('id', id).maybeSingle()
  if (fetchError || !caseRow) return res.status(404).json({ error: 'not_found' })

  const groupId = caseRow.group_id
  const targetUserId = kind === 'message_report' ? caseRow.reported_user_id : caseRow.attached_user_id

  if (decision === 'deleted_message' && kind === 'message_report') {
    const table2 = caseRow.message_kind === 'comment' ? 'group_comments' : 'group_chapter_posts'
    await supabaseAdmin.from(table2).delete().eq('id', caseRow.message_id)
  } else if (decision === 'muted_user' && targetUserId) {
    await supabaseAdmin.from('reading_group_members').update({ silenced_until: new Date(Date.now() + 7 * 86400000).toISOString() }).eq('group_id', groupId).eq('user_id', targetUserId)
  } else if (decision === 'blocked_account' && targetUserId) {
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' })
    await supabaseAdmin.from('blocked_accounts').upsert({ user_id: targetUserId, blocked_by: callerId, reason, blocked_at: new Date().toISOString() })
  }

  await supabaseAdmin.from(table).update({ status: 'resolved' }).eq('id', id)

  if (targetUserId) {
    await supabaseAdmin.from('moderation_actions').insert({
      scope: 'platform', group_id: groupId, actor_id: callerId, target_user_id: targetUserId,
      action: decision, reason: reason || null, source: kind === 'message_report' ? 'message_report' : 'admin_report', source_id: id,
    })
    if (decision !== 'archived') {
      const title = decision === 'deleted_message' ? 'Uma mensagem sua foi removida'
        : decision === 'muted_user' ? 'Você foi silenciado no grupo por 7 dias'
        : 'Sua conta foi bloqueada'
      await supabaseAdmin.from('notifications').insert({ user_id: targetUserId, type: 'moderation_decision', title, body: 'Motivo: ' + reason })
    }
  }

  return res.status(200).json({ ok: true })
}

// "Exportar registro" (42f) — Regra 6.2: "grava autor, data, alvo e
// motivo... exportável em 42f". CSV puro, gerado no cliente a partir
// desta lista (registro completo, não só a fila atual).
async function exportLog(res) {
  const { data, error } = await supabaseAdmin
    .from('moderation_actions')
    .select('created_at, scope, action, reason, actor:profiles!moderation_actions_actor_id_fkey(name), target:profiles!moderation_actions_target_user_id_fkey(name), group:reading_groups!moderation_actions_group_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) return res.status(500).json({ error: 'query_failed' })
  return res.status(200).json({
    rows: (data ?? []).map(r => ({
      createdAt: r.created_at, scope: r.scope, action: r.action, reason: r.reason ?? '',
      actorName: r.actor?.name ?? '', targetName: r.target?.name ?? '', groupName: r.group?.name ?? '',
    })),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const caller = await requireAdmin(req, res)
  if (!caller) return

  const op = req.body?.op
  if (op === 'queue') return listQueue(res)
  if (op === 'case') return getCase(res, req.body?.kind, req.body?.id)
  if (op === 'decide') return decideCase(req, res, caller.id)
  if (op === 'export') return exportLog(res)
  return res.status(400).json({ error: 'invalid_op' })
}
