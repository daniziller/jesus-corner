// Painel do Master — 42g "Grupos e igrejas" (handoff-admin-42, Bloco 4).
// Único lugar do produto que vê TODOS os grupos de uma vez (o Admin de
// grupo só vê o dele — Regra 5) — por isso service role direto, sem
// nenhuma RPC dos Blocos 1-3.
//
// "Por que foi sinalizado" (Regra: "denuncia o grupo inflado, 512
// membros, 28% lendo") — dois sinais, disclosed (o HANDOFF não dá a
// fórmula exata, só o efeito): (1) pico de entradas — membros que
// entraram nos últimos 2 dias muito acima da média histórica de entradas/
// dia do grupo; (2) leitura baixa pro tamanho (grupo grande, poucos
// lendo). Qualquer um dos dois sinaliza; o texto explica qual foi.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TWO_DAYS_MS = 2 * 86400000
const SEVEN_DAYS_MS = 7 * 86400000
const FOURTEEN_DAYS_MS = 14 * 86400000

async function computeGroupStats(group, members) {
  const joined = members.filter(m => m.status === 'joined')
  const memberCount = joined.length
  const ageDays = Math.max(1, (Date.now() - new Date(group.created_at).getTime()) / 86400000)
  const avgDailyJoins = memberCount / ageDays
  const recentJoins = joined.filter(m => Date.now() - new Date(m.joined_at).getTime() < TWO_DAYS_MS).length

  const userIds = joined.map(m => m.user_id)
  let readingPct = 0
  let lastReadDaysAgo = null
  if (userIds.length > 0) {
    const { data: reads } = await supabaseAdmin
      .from('chapters_read')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .gte('created_at', new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString())
    const readingIds = new Set((reads ?? []).filter(r => Date.now() - new Date(r.created_at).getTime() < SEVEN_DAYS_MS).map(r => r.user_id))
    readingPct = Math.round((readingIds.size / memberCount) * 100)
    const lastRead = (reads ?? []).reduce((max, r) => Math.max(max, new Date(r.created_at).getTime()), 0)
    lastReadDaysAgo = lastRead > 0 ? Math.floor((Date.now() - lastRead) / 86400000) : null
  }

  const spikeFlag = recentJoins >= 5 && recentJoins >= avgDailyJoins * 10
  const inflatedFlag = memberCount >= 50 && readingPct < 30
  const flagged = spikeFlag || inflatedFlag
  const reasons = []
  if (spikeFlag) reasons.push(`Entradas ${Math.round(recentJoins / Math.max(avgDailyJoins, 0.1))}× acima da média do grupo`)
  if (inflatedFlag) reasons.push('leitura caindo')

  const stopped = lastReadDaysAgo === null || lastReadDaysAgo > 14

  return {
    memberCount, readingPct, recentJoins, flagged,
    whyFlagged: reasons.join(' e '), stopped, lastReadDaysAgo,
  }
}

async function listGroups(res) {
  const { data: groups, error } = await supabaseAdmin
    .from('reading_groups')
    .select('id, name, created_at, invite_code')
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: 'query_failed' })

  const { data: allMembers } = await supabaseAdmin
    .from('reading_group_members')
    .select('group_id, user_id, status, joined_at, role, member:profiles!reading_group_members_user_id_fkey(name)')

  const membersByGroup = new Map()
  for (const m of allMembers ?? []) {
    if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, [])
    membersByGroup.get(m.group_id).push(m)
  }

  const rows = await Promise.all(groups.map(async g => {
    const members = membersByGroup.get(g.id) ?? []
    const stats = await computeGroupStats(g, members)
    const moderator = members.find(m => m.role === 'moderator' && m.status === 'joined')
    return {
      id: g.id, name: g.name, createdAt: g.created_at, inviteCode: g.invite_code,
      adminName: moderator?.member?.name ?? '', ...stats,
    }
  }))

  return res.status(200).json({
    groups: rows,
    activeCount: rows.filter(r => !r.stopped).length,
    flaggedCount: rows.filter(r => r.flagged).length,
    stoppedCount: rows.filter(r => r.stopped).length,
  })
}

async function groupDetail(res, groupId) {
  const { data: group, error } = await supabaseAdmin.from('reading_groups').select('id, name, created_at, invite_code').eq('id', groupId).maybeSingle()
  if (error || !group) return res.status(404).json({ error: 'not_found' })
  const { data: members } = await supabaseAdmin
    .from('reading_group_members')
    .select('group_id, user_id, status, joined_at, role, member:profiles!reading_group_members_user_id_fkey(name)')
    .eq('group_id', groupId)
  const stats = await computeGroupStats(group, members ?? [])
  const moderator = (members ?? []).find(m => m.role === 'moderator' && m.status === 'joined')
  return res.status(200).json({
    id: group.id, name: group.name, createdAt: group.created_at, inviteCode: group.invite_code,
    adminUserId: moderator?.user_id ?? null, adminName: moderator?.member?.name ?? '', ...stats,
    // Pra "Trocar o admin" (42g) — sem tela própria no pacote pra
    // escolher quem vira o novo admin; devolve os outros membros aqui
    // pra um seletor simples no lado do client.
    otherMembers: (members ?? []).filter(m => m.status === 'joined' && m.role !== 'moderator').map(m => ({ userId: m.user_id, name: m.member?.name ?? '' })),
  })
}

async function performAction(req, res, callerId) {
  const { groupId, action, newAdminUserId } = req.body ?? {}
  if (!groupId) return res.status(400).json({ error: 'invalid_group' })

  if (action === 'invalidate_code') {
    // Reaproveita generate_group_invite_code() (migration 0046) — mesmo
    // formato (XX-NNNN) e mesma checagem de unicidade da geração
    // original, em vez de reimplementar o sorteio aqui (achado por
    // revisão de segurança automática nesta PR: uma reimplementação
    // ad-hoc com Math.random() nem batia com o formato real nem usava um
    // gerador criptográfico).
    const { data: newCode, error: rpcError } = await supabaseAdmin.rpc('generate_group_invite_code')
    if (rpcError) return res.status(500).json({ error: 'code_generation_failed' })
    const { error } = await supabaseAdmin.from('reading_groups').update({ invite_code: newCode }).eq('id', groupId)
    if (error) return res.status(500).json({ error: 'update_failed' })
    return res.status(200).json({ ok: true })
  }

  // "Falar com o admin" (42g) — sem sistema de conversa 1:1 no app;
  // mesma saída já usada em toda a leva (send_group_encouragement,
  // decide_group_message_report): uma notificação individual de verdade
  // (sino), não um recado público.
  if (action === 'message_admin') {
    const { message } = req.body ?? {}
    if (!(message ?? '').trim()) return res.status(400).json({ error: 'missing_message' })
    const { data: mod } = await supabaseAdmin.from('reading_group_members').select('user_id').eq('group_id', groupId).eq('role', 'moderator').eq('status', 'joined').limit(1).maybeSingle()
    if (!mod) return res.status(404).json({ error: 'admin_not_found' })
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: mod.user_id, type: 'master_message', title: 'Mensagem da equipe do Jesus Corner', body: message.trim(),
    })
    if (error) return res.status(500).json({ error: 'send_failed' })
    return res.status(200).json({ ok: true })
  }

  if (action === 'change_admin') {
    if (!newAdminUserId) return res.status(400).json({ error: 'missing_new_admin' })
    await supabaseAdmin.from('reading_group_members').update({ role: 'member' }).eq('group_id', groupId).eq('role', 'moderator')
    const { error } = await supabaseAdmin.from('reading_group_members').update({ role: 'moderator' }).eq('group_id', groupId).eq('user_id', newAdminUserId)
    if (error) return res.status(500).json({ error: 'update_failed' })
    return res.status(200).json({ ok: true })
  }

  if (action === 'end_group') {
    const { data: members } = await supabaseAdmin.from('reading_group_members').select('user_id').eq('group_id', groupId).eq('status', 'joined')
    await supabaseAdmin.from('moderation_actions').insert({
      scope: 'platform', group_id: null, actor_id: callerId, target_user_id: null,
      action: 'ended_group', reason: `Grupo encerrado pelo Master (${(members ?? []).length} membros).`, source: 'manual',
    })
    const { error } = await supabaseAdmin.from('reading_groups').delete().eq('id', groupId)
    if (error) return res.status(500).json({ error: 'delete_failed' })
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'invalid_action' })
}

// "Ver mural do grupo" (42g) — leitura, sem ação nenhuma daqui (apagar
// mensagem continua só pela fila de Moderação, com motivo registrado).
async function groupWall(res, groupId) {
  const { data, error } = await supabaseAdmin
    .from('group_comments')
    .select('id, body, created_at, author:profiles!group_comments_user_id_fkey(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return res.status(500).json({ error: 'query_failed' })
  return res.status(200).json({
    comments: (data ?? []).map(c => ({ id: c.id, name: c.author?.name ?? '', body: c.body, createdAt: c.created_at })),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const caller = await requireAdmin(req, res)
  if (!caller) return

  const op = req.body?.op
  if (op === 'list') return listGroups(res)
  if (op === 'detail') return groupDetail(res, req.body?.groupId)
  if (op === 'action') return performAction(req, res, caller.id)
  if (op === 'wall') return groupWall(res, req.body?.groupId)
  return res.status(400).json({ error: 'invalid_op' })
}
