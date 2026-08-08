// Métricas agregadas pro painel admin — usuários/assinaturas + Fale Conosco.
// admin_total_users()/admin_new_users_by_day() são RPCs (ver
// supabase/migrations/0020_admin.sql) porque auth.users não é exposto via
// PostgREST, nem pro service role.
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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

  const [totalUsersRes, newByDayRes, subsRes, contactTotalRes, contactUnansweredRes] = await Promise.all([
    supabaseAdmin.rpc('admin_total_users'),
    supabaseAdmin.rpc('admin_new_users_by_day', { days_back: 30 }),
    supabaseAdmin.from('subscriptions').select('access_type, status, plan, currency, amount_cents'),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }).is('replied_at', null),
  ])

  if (totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error) {
    const err = totalUsersRes.error || newByDayRes.error || subsRes.error || contactTotalRes.error || contactUnansweredRes.error
    console.error('Failed to load admin metrics:', err.message)
    return res.status(500).json({ error: 'query_failed' })
  }

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
  })
}
