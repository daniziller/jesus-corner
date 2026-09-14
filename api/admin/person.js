// Painel do Master — 42d "Pessoa" (handoff-admin-42, Bloco 5). Detalhe de
// UMA pessoa pro Master agir: mesmo cálculo de progresso/sequência de
// api/admin/user-detail.js (não duplica), mais o que só esta tela precisa —
// grupos, registro de moderação da pessoa, e as duas ações que só o Master
// tem (Regra 5): "Dar acesso grátis" já existe em api/admin/access.js
// (grantAccess aceita e-mail, sem endpoint novo); "Estender trial" e
// "Entrar como este usuário" são novas, ficam aqui.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { deriveProgress, computeOverallStats } from '../../src/utils/progress.js'
import { computeRoutineStreak } from '../../src/routine/routineStreak.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BRAZIL_UTC_OFFSET_MS = -3 * 60 * 60 * 1000
function brazilReferenceDate() { return new Date(Date.now() + BRAZIL_UTC_OFFSET_MS) }

const NINETY_DAYS_MS = 90 * 86400000

async function personDetail(res, userId) {
  const [authUserRes, subRes, userDataRes, groupsRes, blockedRes, modRes, readsRes] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin.from('subscriptions').select('status, plan, tier, currency, amount_cents, access_type, current_period_end, created_at').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('user_data').select('completed_keys, plan_id, daily_routine').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('reading_group_members').select('role, group:reading_groups!reading_group_members_group_id_fkey(id, name)').eq('user_id', userId).eq('status', 'joined'),
    supabaseAdmin.from('blocked_accounts').select('reason, blocked_at').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('moderation_actions').select('created_at, action, reason, scope, actor:profiles!moderation_actions_actor_id_fkey(name), group:reading_groups!moderation_actions_group_id_fkey(name)').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20),
    // "Constância" (42d) — % de dias com leitura nos últimos 90 dias, mesma
    // ideia de computeUsagePct (api/admin/access.js) mas na janela de 42d.
    supabaseAdmin.from('chapters_read').select('created_at').eq('user_id', userId).gte('created_at', new Date(Date.now() - NINETY_DAYS_MS).toISOString()),
  ])
  if (authUserRes.error || !authUserRes.data?.user) return res.status(404).json({ error: 'user_not_found' })
  const activeDays = new Set((readsRes.data ?? []).map(r => r.created_at.slice(0, 10))).size
  const constancyPct = Math.round((activeDays / 90) * 100)

  const authUser = authUserRes.data.user
  const userData = userDataRes.data
  let biblePercent = 0
  if (userData) {
    const completedSet = new Set(userData.completed_keys ?? [])
    const { blocks } = deriveProgress(completedSet, userData.plan_id ?? 'standard')
    biblePercent = computeOverallStats(blocks).biblePercent
  }
  const sub = subRes.data

  return res.status(200).json({
    id: authUser.id, email: authUser.email, name: authUser.user_metadata?.name ?? null,
    createdAt: authUser.created_at, lastSignInAt: authUser.last_sign_in_at,
    subscription: sub ? {
      status: sub.status, plan: sub.plan, tier: sub.tier, accessType: sub.access_type,
      currentPeriodEnd: sub.current_period_end, createdAt: sub.created_at,
    } : null,
    progress: {
      streak: userData ? computeRoutineStreak(userData.daily_routine ?? {}, brazilReferenceDate()) : 0,
      biblePercent, planId: userData?.plan_id ?? 'standard', constancyPct,
    },
    groups: (groupsRes.data ?? []).map(g => ({ id: g.group?.id, name: g.group?.name ?? '', role: g.role })),
    blocked: blockedRes.data ? { reason: blockedRes.data.reason, blockedAt: blockedRes.data.blocked_at } : null,
    moderationHistory: (modRes.data ?? []).map(m => ({
      createdAt: m.created_at, action: m.action, reason: m.reason ?? '', scope: m.scope,
      actorName: m.actor?.name ?? '', groupName: m.group?.name ?? '',
    })),
  })
}

// "Estender trial" — Regra 6.5: distinto de conceder acesso de cortesia
// (api/admin/access.js); aqui só empurra o FIM do período de um trial que
// já está EM CURSO (status='trialing'). Fora de trial, o botão fica
// desabilitado no cliente com o motivo escrito — não é simulado aqui, é
// uma checagem real que o cliente lê pra decidir o estado do botão.
async function extendTrial(req, res, callerId) {
  const { userId, days } = req.body ?? {}
  const extendDays = Number(days) || 7
  const { data: sub, error: fetchError } = await supabaseAdmin.from('subscriptions').select('status, current_period_end').eq('user_id', userId).maybeSingle()
  if (fetchError || !sub) return res.status(404).json({ error: 'subscription_not_found' })
  if (sub.status !== 'trialing') return res.status(400).json({ error: 'not_in_trial' })

  const base = sub.current_period_end ? new Date(sub.current_period_end) : new Date()
  const newEnd = new Date(Math.max(base.getTime(), Date.now()) + extendDays * 86400000)
  const { error } = await supabaseAdmin.from('subscriptions').update({ current_period_end: newEnd.toISOString(), updated_at: new Date().toISOString() }).eq('user_id', userId)
  if (error) return res.status(500).json({ error: 'update_failed' })

  await supabaseAdmin.from('moderation_actions').insert({
    scope: 'platform', actor_id: callerId, target_user_id: userId,
    action: 'extended_trial', reason: `+${extendDays} dias`, source: 'manual',
  })
  await supabaseAdmin.from('notifications').insert({
    user_id: userId, type: 'trial_extended', title: 'Seu período de teste foi estendido',
    body: `Mais ${extendDays} dias de teste, até ${newEnd.toLocaleDateString('pt-BR')}.`,
  })
  return res.status(200).json({ ok: true, newExpiresAt: newEnd.toISOString() })
}

// "Bloquear conta" direto do rodapé de 42d — sem denúncia associada (a
// mesma ação já existe em api/admin/moderation.js, mas presa a um caso da
// fila; aqui é a pessoa em si, motivo digitado na hora). Mesmo mecanismo
// (ban_duration + blocked_accounts) e mesmo registro/aviso de
// decideCase, só sem o `table`/status de denúncia pra atualizar.
async function blockAccount(req, res, callerId) {
  const { userId, reason } = req.body ?? {}
  if (!userId) return res.status(400).json({ error: 'missing_user_id' })
  if (!(reason ?? '').trim()) return res.status(400).json({ error: 'reason_required' })

  await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
  await supabaseAdmin.from('blocked_accounts').upsert({ user_id: userId, blocked_by: callerId, reason: reason.trim(), blocked_at: new Date().toISOString() })
  await supabaseAdmin.from('moderation_actions').insert({
    scope: 'platform', actor_id: callerId, target_user_id: userId,
    action: 'blocked_account', reason: reason.trim(), source: 'manual',
  })
  await supabaseAdmin.from('notifications').insert({ user_id: userId, type: 'moderation_decision', title: 'Sua conta foi bloqueada', body: 'Motivo: ' + reason.trim() })
  return res.status(200).json({ ok: true })
}

// "Entrar como este usuário" (Regra 6.11) — somente leitura: não gera
// sessão nem credencial nenhuma da pessoa (isso seria logar como ela de
// verdade, um passo bem mais sensível do que o quadro pede). O que a tela
// mostra depois é o MESMO personDetail acima, envolto numa faixa
// permanente de "vendo como fulano" no cliente. Fica no registro dos
// dois: aqui (moderation_actions, o que o Master exporta em 42f) e do
// lado da pessoa (notifications, o mesmo canal já usado em toda a leva
// pra avisar a conta de algo que aconteceu com ela).
async function enterAs(req, res, callerId) {
  const { userId } = req.body ?? {}
  if (!userId) return res.status(400).json({ error: 'missing_user_id' })
  await supabaseAdmin.from('moderation_actions').insert({
    scope: 'platform', actor_id: callerId, target_user_id: userId,
    action: 'viewed_as_user', reason: null, source: 'manual',
  })
  await supabaseAdmin.from('notifications').insert({
    user_id: userId, type: 'admin_viewed_account',
    title: 'A equipe do Jesus Corner visualizou sua conta',
    body: 'Em modo somente leitura, para dar suporte. Nenhuma alteração foi feita.',
  })
  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const caller = await requireAdmin(req, res)
  if (!caller) return

  const op = req.body?.op
  if (op === 'detail') return personDetail(res, req.body?.userId)
  if (op === 'extend_trial') return extendTrial(req, res, caller.id)
  if (op === 'enter_as') return enterAs(req, res, caller.id)
  if (op === 'block_account') return blockAccount(req, res, caller.id)
  return res.status(400).json({ error: 'invalid_op' })
}
