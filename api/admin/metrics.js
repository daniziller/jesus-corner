// Métricas agregadas pro painel admin — usuários/assinaturas + Fale Conosco
// + funil de onboarding (ver supabase/migrations/0022_onboarding_funnel.sql).
// admin_total_users()/admin_new_users_by_day() são RPCs (ver
// supabase/migrations/0020_admin.sql) porque auth.users não é exposto via
// PostgREST, nem pro service role.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Ordem de exibição do funil — bate com STEPS de OnboardingWizard em
// src/screens/AuthScreen.jsx, mais os dois eventos que acontecem dentro do
// passo de cadastro sem trocar de "step" (ver trackOnboardingEvent ali).
const FUNNEL_STEPS = [
  'name', 'features', 'prayerTime', 'readingPlan', 'reflectionTime', 'preview', 'signup',
  'signup_completed', 'checkout_started',
]
const FUNNEL_WINDOW_DAYS = 30

// Mesma normalização de api/send-contribution-reminders.js — nunca somar
// valores de moedas diferentes.
function monthlyEquivalentCents(sub) {
  if (sub.amount_cents == null) return null
  return sub.plan === 'annual' ? sub.amount_cents / 12 : sub.amount_cents
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const windowStart = new Date(Date.now() - FUNNEL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [totalUsersRes, newByDayRes, subsRes, contactTotalRes, contactUnansweredRes, funnelEventsRes, subsCreatedRes] = await Promise.all([
    supabaseAdmin.rpc('admin_total_users'),
    supabaseAdmin.rpc('admin_new_users_by_day', { days_back: 30 }),
    supabaseAdmin.from('subscriptions').select('access_type, status, plan, currency, amount_cents'),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }).is('replied_at', null),
    supabaseAdmin.from('onboarding_events').select('session_id, step').gte('created_at', windowStart),
    supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).gte('created_at', windowStart),
  ])

  if (totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error || funnelEventsRes.error || subsCreatedRes.error) {
    const err = totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error || funnelEventsRes.error || subsCreatedRes.error
    console.error('Failed to load admin metrics:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  // Sessões distintas que chegaram em cada passo, nos últimos 30 dias —
  // conta "quantas pessoas", não "quantos eventos" (voltar/avançar de novo
  // no mesmo passo não infla o número).
  const sessionsByStep = {}
  for (const step of FUNNEL_STEPS) sessionsByStep[step] = new Set()
  for (const row of funnelEventsRes.data ?? []) {
    if (sessionsByStep[row.step]) sessionsByStep[row.step].add(row.session_id)
  }
  const funnel = FUNNEL_STEPS.map(step => ({ step, count: sessionsByStep[step].size }))
  // "Assinaram" vem de subscriptions.created_at, não de um evento de sessão —
  // cobre tanto o checkout do Stripe (webhook) quanto o convite grátis
  // (upsert direto), sem precisar linkar sessionId até o Stripe.
  const subscribedCount = subsCreatedRes.count ?? 0

  const subs = subsRes.data ?? []
  const activeRecurring = subs.filter(s => s.access_type === 'recurring' && ['active', 'trialing'].includes(s.status))

  const mrrCents = { brl: 0, usd: 0 }
  const activeByPlan = { brl: { monthly: 0, annual: 0 }, usd: { monthly: 0, annual: 0 } }
  for (const sub of activeRecurring) {
    if (!sub.currency || !(sub.currency in mrrCents)) continue
    const monthly = monthlyEquivalentCents(sub)
    if (monthly != null) mrrCents[sub.currency] += monthly
    if (sub.plan === 'monthly' || sub.plan === 'annual') activeByPlan[sub.currency][sub.plan] += 1
  }

  const free = subs.filter(s => s.access_type === 'free' && s.status === 'active').length
  const lifetime = subs.filter(s => s.access_type === 'lifetime' && s.status === 'active').length

  return res.status(200).json({
    users: {
      total: totalUsersRes.data ?? 0,
      newByDay: newByDayRes.data ?? [],
    },
    subscriptions: {
      mrrCents: { brl: Math.round(mrrCents.brl), usd: Math.round(mrrCents.usd) },
      activeByPlan,
      free,
      lifetime,
    },
    contact: {
      total: contactTotalRes.count ?? 0,
      unanswered: contactUnansweredRes.count ?? 0,
      answered: (contactTotalRes.count ?? 0) - (contactUnansweredRes.count ?? 0),
    },
    onboardingFunnel: {
      windowDays: FUNNEL_WINDOW_DAYS,
      steps: funnel,
      subscribed: subscribedCount,
    },
  })
}
