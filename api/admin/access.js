// Painel do Master — 42h "Acessos" (handoff-admin-42, Bloco 4). Concede
// acesso de cortesia preenchendo subscriptions direto (o MESMO mecanismo
// que já libera acesso pago/vitalício — ver src/billing/entitlement.js:
// access_type 'free'/'lifetime' fica ativo enquanto status='active', sem
// ciclo de cobrança) — nenhuma tela do app precisa saber que é cortesia.
// access_grants (migration 0068) é só o REGISTRO: motivo, quem concedeu,
// prazo — subscriptions sozinha não guarda "por quê" nem "até quando"
// pra um acesso 'free'.
//
// "Vitalício" tier: sempre premium_ai (mais generoso — é um favor, ver
// Regra 6.5) — o formulário de 42h não oferece escolha de tier, só de
// duração, então essa é a decisão embutida.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const PREMIUM_AI_MONTHLY_BRL = 21.90
const DURATIONS = { '3_months': 3, '6_months': 6, '12_months': 12, lifetime: null }
const THIRTY_DAYS_MS = 30 * 86400000

async function computeUsagePct(userId) {
  const { data } = await supabaseAdmin
    .from('chapters_read')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - THIRTY_DAYS_MS).toISOString())
  const days = new Set((data ?? []).map(r => r.created_at.slice(0, 10)))
  return Math.round((days.size / 30) * 100)
}

async function listAccess(res) {
  const { data: grants, error } = await supabaseAdmin
    .from('access_grants')
    .select('id, user_id, kind, reason, expires_at, revoked_at, created_at, person:profiles!access_grants_user_id_fkey(name)')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: 'query_failed' })

  const emails = {}
  await Promise.all([...new Set((grants ?? []).map(g => g.user_id))].map(async id => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(id).catch(() => ({ data: null }))
    if (u?.user?.email) emails[id] = u.user.email
  }))

  const rows = await Promise.all((grants ?? []).map(async g => ({
    id: g.id, userId: g.user_id, name: g.person?.name ?? '', email: emails[g.user_id] ?? '',
    kind: g.kind, reason: g.reason, expiresAt: g.expires_at, createdAt: g.created_at,
    usagePct: await computeUsagePct(g.user_id),
  })))

  const lifetimeCount = rows.filter(r => r.kind === 'lifetime').length
  const periodRows = rows.filter(r => r.kind !== 'lifetime')
  const expiringSoon = periodRows.filter(r => r.expiresAt && new Date(r.expiresAt).getTime() - Date.now() < THIRTY_DAYS_MS).length

  return res.status(200).json({
    grants: rows,
    lifetimeCount,
    periodCount: periodRows.length,
    periodExpiringSoonCount: expiringSoon,
    // "Trials estendidos" depende da ação "Estender trial" de 42d (Bloco
    // 5, turno 42, ainda não construída) — sem produtor de dado ainda,
    // real (não inventado), só zerado.
    trialsExtendedCount: 0,
    trialsConvertedPct: 0,
    totalAccounts: rows.length,
    abdicatedMonthlyBrl: Math.round(rows.length * PREMIUM_AI_MONTHLY_BRL * 100) / 100,
  })
}

async function grantAccess(req, res, callerId) {
  const { emailOrName, kind, reason } = req.body ?? {}
  if (!(kind in DURATIONS)) return res.status(400).json({ error: 'invalid_kind' })
  if (!(reason ?? '').trim()) return res.status(400).json({ error: 'reason_required' })
  const query = (emailOrName ?? '').trim()
  if (!query) return res.status(400).json({ error: 'missing_person' })

  // Acha a pessoa por e-mail (auth.users, via listUsers — sem índice de
  // busca por e-mail na Admin API, então filtra em memória; base de
  // usuários deste app não é grande o bastante pra isso pesar) ou por
  // nome (profiles).
  let userId = null
  if (query.includes('@')) {
    let page = 1
    while (!userId && page <= 20) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
      const found = data?.users?.find(u => u.email?.toLowerCase() === query.toLowerCase())
      if (found) userId = found.id
      if (!data?.users?.length || data.users.length < 200) break
      page += 1
    }
  } else {
    const { data } = await supabaseAdmin.from('profiles').select('user_id').ilike('name', `%${query}%`).limit(1).maybeSingle()
    userId = data?.user_id ?? null
  }
  if (!userId) return res.status(404).json({ error: 'person_not_found' })

  const months = DURATIONS[kind]
  const expiresAt = months ? new Date(Date.now() + months * 30 * 86400000).toISOString() : null

  const { error: subError } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId, status: 'active', access_type: kind === 'lifetime' ? 'lifetime' : 'free',
    tier: 'premium_ai', current_period_end: expiresAt, updated_at: new Date().toISOString(),
  })
  if (subError) { console.error('[admin/access] subscription upsert failed', subError.message); return res.status(500).json({ error: 'grant_failed' }) }

  const { error: grantError } = await supabaseAdmin.from('access_grants').insert({
    user_id: userId, granted_by: callerId, kind, reason: reason.trim(), expires_at: expiresAt,
  })
  if (grantError) console.error('[admin/access] access_grants insert failed', grantError.message)

  const durationLabel = kind === 'lifetime' ? 'vitalício' : `${months} meses`
  await supabaseAdmin.from('notifications').insert({
    user_id: userId, type: 'access_granted',
    title: 'Você ganhou acesso Premium + IA de cortesia',
    body: `Cortesia por ${durationLabel}${expiresAt ? `, até ${new Date(expiresAt).toLocaleDateString('pt-BR')}` : ''}. Motivo: ${reason.trim()}.${expiresAt ? ' Depois desse prazo, o acesso volta ao normal.' : ''}`,
  })

  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const caller = await requireAdmin(req, res)
  if (!caller) return

  const op = req.body?.op
  if (op === 'list') return listAccess(res)
  if (op === 'grant') return grantAccess(req, res, caller.id)
  return res.status(400).json({ error: 'invalid_op' })
}
