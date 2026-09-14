// Detector de alertas do Master (handoff-admin-42, Bloco 5: 42b) — cron.
// Regra 6.4: só 4 tipos, cada um com gatilho específico. Três têm fonte de
// dado real hoje e ganham detector; "técnico" fica com o TIPO pronto no
// schema (migration 0069) mas SEM detector — disclosed: este app não tem
// infraestrutura de rastreio de falha técnica (crash/sync reporting),
// então criar esse alerta de verdade exigiria construir essa infra
// primeiro, fora do escopo desta leva. O exemplo do quadro 42b
// ("Sincronização... 214 sessões") é ilustrativo, não um dado real.
//
// - denúncia escalada: espelha 1:1 group_message_reports.status='escalated'
//   (mesma fonte de 42f) — um alerta por denúncia, sem duplicar se já
//   existe (índice único em master_alerts).
// - crescimento: mesmo spikeFlag que 42g já calcula pra sinalizar o
//   grupo (computeGroupStats, api/admin/groups.js) — um alerta por grupo
//   sinalizado, sem recriar enquanto o alerta anterior seguir aberto.
// - cancelamentos: subscriptions.status='canceled' com updated_at nas
//   últimas 24h, comparado à média diária dos 7 dias anteriores — só
//   dispara se hoje for >=3x a média E >=3 cancelamentos (evita alerta por
//   ruído de base pequena).
import { createClient } from '@supabase/supabase-js'
import { computeGroupStats } from './admin/groups.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const DAY_MS = 86400000

async function detectDenuncia() {
  const { data: reports } = await supabaseAdmin
    .from('group_message_reports')
    .select('id, reason, group:reading_groups!group_message_reports_group_id_fkey(name)')
    .eq('status', 'escalated')
  for (const r of reports ?? []) {
    await supabaseAdmin.from('master_alerts').upsert({
      kind: 'denuncia', source: 'group_message_reports', source_id: r.id,
      title: 'Denúncia escalada',
      detail: `${r.group?.name ?? 'Grupo'} · motivo: ${r.reason}`,
      primary_action: 'moderation_case',
      status: 'open', updated_at: new Date().toISOString(),
    }, { onConflict: 'kind,source,source_id', ignoreDuplicates: true })
  }
}

async function detectCrescimento() {
  const { data: groups } = await supabaseAdmin.from('reading_groups').select('id, name, created_at')
  const { data: allMembers } = await supabaseAdmin
    .from('reading_group_members')
    .select('group_id, user_id, status, joined_at, role')
  const membersByGroup = new Map()
  for (const m of allMembers ?? []) {
    if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, [])
    membersByGroup.get(m.group_id).push(m)
  }
  for (const g of groups ?? []) {
    const stats = await computeGroupStats(g, membersByGroup.get(g.id) ?? [])
    if (!stats.spikeFlag) continue
    // Não recria se já existe um alerta ABERTO pra este grupo — o Master
    // decide quando arquivar/resolver, o detector não reabre sozinho.
    const { data: existing } = await supabaseAdmin.from('master_alerts')
      .select('id').eq('kind', 'crescimento').eq('source', 'reading_groups').eq('source_id', g.id).eq('status', 'open').maybeSingle()
    if (existing) continue
    await supabaseAdmin.from('master_alerts').insert({
      kind: 'crescimento', source: 'reading_groups', source_id: g.id,
      title: 'Entradas muito acima da média',
      detail: `${g.name} · ${stats.recentJoins} entradas nos últimos 2 dias`,
      primary_action: 'group_detail',
      status: 'open',
    })
  }
}

async function detectCancelamentos() {
  const since7d = new Date(Date.now() - 7 * DAY_MS).toISOString()
  const { data: recent } = await supabaseAdmin
    .from('subscriptions')
    .select('updated_at')
    .eq('status', 'canceled')
    .gte('updated_at', since7d)
  const byDay = {}
  for (const r of recent ?? []) {
    const day = r.updated_at.slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  }
  const today = new Date().toISOString().slice(0, 10)
  const todayCount = byDay[today] ?? 0
  const priorDays = Object.entries(byDay).filter(([day]) => day !== today)
  const priorTotal = priorDays.reduce((sum, [, c]) => sum + c, 0)
  const avgDaily = priorDays.length > 0 ? priorTotal / priorDays.length : 0

  if (todayCount >= 3 && todayCount >= avgDaily * 3) {
    const { data: existing } = await supabaseAdmin.from('master_alerts')
      .select('id').eq('kind', 'cancelamentos').eq('source', 'subscriptions').is('source_id', null).eq('status', 'open')
      .gte('created_at', new Date(Date.now() - DAY_MS).toISOString()).maybeSingle()
    if (!existing) {
      await supabaseAdmin.from('master_alerts').insert({
        kind: 'cancelamentos', source: 'subscriptions', source_id: null,
        title: 'Cancelamentos acima da média',
        detail: `${todayCount} cancelamentos hoje · média dos últimos dias: ${avgDaily.toFixed(1)}`,
        primary_action: null,
        status: 'open',
      })
    }
  }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('detect-master-alerts: CRON_SECRET não configurado')
    return res.status(500).json({ error: 'server misconfigured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  await Promise.all([detectDenuncia(), detectCrescimento(), detectCancelamentos()])
  return res.status(200).json({ ok: true })
}
