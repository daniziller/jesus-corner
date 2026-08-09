// Métricas agregadas pro painel admin — usuários/assinaturas + Fale Conosco
// + funil de onboarding (ver supabase/migrations/0022/0023) + pagamentos
// pendentes + retenção. O funil aceita filtros de período (`days`) e idioma
// (`language`) no corpo do POST — os cards de topo (total de usuários, MRR
// etc.) continuam sempre no estado atual, sem filtro, mesmo comportamento
// de antes.
// admin_total_users()/admin_new_users_by_day() são RPCs (ver
// supabase/migrations/0020_admin.sql) porque auth.users não é exposto via
// PostgREST, nem pro service role.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'
import { listAllUsers } from '../_lib/adminUsers.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Ordem de exibição do funil — bate com STEPS de OnboardingWizard em
// src/screens/AuthScreen.jsx, mais os dois eventos que acontecem dentro do
// passo de cadastro sem trocar de "step" (ver trackOnboardingEvent ali).
const FUNNEL_STEPS = [
  'name', 'features', 'prayerTime', 'readingPlan', 'reflectionTime', 'preview', 'signup',
  'signup_completed', 'checkout_started',
]
const FUNNEL_WINDOW_DAYS_DEFAULT = 30
const FUNNEL_WINDOW_DAYS_MAX = 3650 // ~10 anos, cobre "todo o período" sem query sem limite

const RECURRING_ACTIVE_STATUSES = ['active', 'trialing']

// Mesma normalização de api/send-contribution-reminders.js — nunca somar
// valores de moedas diferentes.
function monthlyEquivalentCents(sub) {
  if (sub.amount_cents == null) return null
  return sub.plan === 'annual' ? sub.amount_cents / 12 : sub.amount_cents
}

// Retenção só é honesta como "ainda ativa hoje, N dias depois de assinar" —
// não temos histórico de status por dia (subscriptions é uma linha só por
// usuário, sobrescrita a cada mudança), então não dá pra saber se alguém
// cancelou no dia 3 ou no dia 25, só que hoje não está mais ativo. Por isso
// a coorte é uma janela (ex: assinou entre 7 e 37 dias atrás) em vez de um
// dia exato — dá uma amostra razoável sem fingir precisão que não existe.
function computeRetentionCohort(recurringSubs, minDays, maxDays) {
  const now = Date.now()
  const cohort = recurringSubs.filter(s => {
    if (!s.created_at) return false
    const ageDays = (now - new Date(s.created_at).getTime()) / 86400000
    return ageDays >= minDays && ageDays <= maxDays
  })
  const retained = cohort.filter(s => RECURRING_ACTIVE_STATUSES.includes(s.status)).length
  return {
    cohortSize: cohort.length,
    retained,
    pct: cohort.length > 0 ? Math.round((retained / cohort.length) * 100) : null,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const rawDays = Number(req.body?.days)
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.round(rawDays), FUNNEL_WINDOW_DAYS_MAX) : FUNNEL_WINDOW_DAYS_DEFAULT
  const language = req.body?.language === 'pt' || req.body?.language === 'en' ? req.body.language : null
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let funnelEventsQuery = supabaseAdmin.from('onboarding_events').select('session_id, step').gte('created_at', windowStart)
  if (language) funnelEventsQuery = funnelEventsQuery.eq('language', language)

  const [totalUsersRes, newByDayRes, subsRes, contactTotalRes, contactUnansweredRes, funnelEventsRes] = await Promise.all([
    supabaseAdmin.rpc('admin_total_users'),
    supabaseAdmin.rpc('admin_new_users_by_day', { days_back: 30 }),
    supabaseAdmin.from('subscriptions').select('user_id, access_type, status, plan, currency, amount_cents, current_period_end, created_at'),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }).is('replied_at', null),
    funnelEventsQuery,
  ])

  if (totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error || funnelEventsRes.error) {
    const err = totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error || funnelEventsRes.error
    console.error('Failed to load admin metrics:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  const subs = subsRes.data ?? []

  // Sessões distintas que chegaram em cada passo, no período escolhido —
  // conta "quantas pessoas", não "quantos eventos" (voltar/avançar de novo
  // no mesmo passo não infla o número).
  const sessionsByStep = {}
  for (const step of FUNNEL_STEPS) sessionsByStep[step] = new Set()
  for (const row of funnelEventsRes.data ?? []) {
    if (sessionsByStep[row.step]) sessionsByStep[row.step].add(row.session_id)
  }
  const startedCount = sessionsByStep[FUNNEL_STEPS[0]].size
  const pctOf = n => (startedCount > 0 ? Math.round((n / startedCount) * 100) : 0)
  const funnel = FUNNEL_STEPS.map(step => {
    const count = sessionsByStep[step].size
    return { step, count, pct: pctOf(count) }
  })

  // subscriptions não tem coluna de idioma nem de "pagamento pendente" com
  // nome/email prontos — os dois precisam cruzar com
  // auth.users.user_metadata via listAllUsers(), então só busca a lista
  // completa quando algum dos dois de fato precisa dela.
  const pastDueSubs = subs.filter(s => s.status === 'past_due')
  let usersById = null
  if (language || pastDueSubs.length > 0) {
    try {
      usersById = new Map((await listAllUsers()).map(u => [u.id, u]))
    } catch (err) {
      console.error('Failed to load users for admin metrics:', err.message)
      return res.status(500).json({ error: 'query_failed' })
    }
  }

  // "Assinaram" vem de subscriptions.created_at, não de um evento de sessão —
  // cobre tanto o checkout do Stripe (webhook) quanto o convite grátis
  // (upsert direto), sem precisar linkar sessionId até o Stripe.
  const subscribedInWindow = subs.filter(s => s.created_at && s.created_at >= windowStart)
  const subscribedCount = language
    ? subscribedInWindow.filter(s => (usersById.get(s.user_id)?.user_metadata?.language === 'en' ? 'en' : 'pt') === language).length
    : subscribedInWindow.length

  const pastDueSubscriptions = pastDueSubs
    .map(s => {
      const u = usersById?.get(s.user_id)
      return {
        email: u?.email ?? null,
        name: u?.user_metadata?.name ?? null,
        plan: s.plan,
        currency: s.currency,
        amountCents: s.amount_cents,
        currentPeriodEnd: s.current_period_end,
      }
    })
    .sort((a, b) => (a.currentPeriodEnd ?? '').localeCompare(b.currentPeriodEnd ?? ''))

  const recurringSubs = subs.filter(s => s.access_type === 'recurring')
  const retention = {
    d7: computeRetentionCohort(recurringSubs, 7, 37),
    d30: computeRetentionCohort(recurringSubs, 30, 90),
  }

  const activeRecurring = recurringSubs.filter(s => RECURRING_ACTIVE_STATUSES.includes(s.status))

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
    pastDueSubscriptions,
    retention,
    onboardingFunnel: {
      windowDays: days,
      language,
      steps: funnel,
      subscribed: subscribedCount,
      subscribedPct: pctOf(subscribedCount),
    },
  })
}
