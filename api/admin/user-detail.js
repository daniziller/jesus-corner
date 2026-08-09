// Detalhe completo de um usuário pro admin (aba Usuários) — junta conta,
// assinatura e progresso de leitura numa resposta só, pra dar contexto
// rápido sem cruzar telas (ex: ao responder um Fale Conosco). Reaproveita
// exatamente o mesmo pipeline de cálculo de progresso do app
// (deriveProgress/computeOverallStats, ver src/utils/progress.js) em vez de
// duplicar a lógica, mesmo padrão de api/verify-google-play-purchase.js
// importando de src/.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { deriveProgress, computeOverallStats } from '../../src/utils/progress.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const userId = req.body?.userId
  if (typeof userId !== 'string' || !userId) return res.status(400).json({ error: 'missing_user_id' })

  const [authUserRes, subRes, userDataRes, profileRes] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin.from('subscriptions').select('status, plan, currency, amount_cents, access_type, current_period_end, created_at').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('user_data').select('completed_keys, streak, plan_id, last_login_at').eq('user_id', userId).maybeSingle(),
    supabaseAdmin.from('profiles').select('bio, is_public').eq('user_id', userId).maybeSingle(),
  ])

  if (authUserRes.error || !authUserRes.data?.user) {
    return res.status(404).json({ error: 'user_not_found' })
  }
  if (subRes.error || userDataRes.error || profileRes.error) {
    const err = subRes.error || userDataRes.error || profileRes.error
    console.error('Failed to load admin user detail:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

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
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name ?? null,
    language: authUser.user_metadata?.language === 'en' ? 'en' : 'pt',
    createdAt: authUser.created_at,
    lastSignInAt: authUser.last_sign_in_at,
    subscription: sub ? {
      status: sub.status,
      plan: sub.plan,
      accessType: sub.access_type,
      currency: sub.currency,
      amountCents: sub.amount_cents,
      currentPeriodEnd: sub.current_period_end,
      createdAt: sub.created_at,
    } : null,
    progress: {
      streak: userData?.streak ?? 0,
      biblePercent,
      planId: userData?.plan_id ?? 'standard',
      lastLoginAt: userData?.last_login_at ?? null,
    },
    profile: profileRes.data ? { bio: profileRes.data.bio, isPublic: profileRes.data.is_public } : null,
  })
}
