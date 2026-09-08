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

// Ordem de exibição do funil (23a mostra só os 5 primeiros, ver
// AdminScreen.jsx) — os 5 marcos reais do fluxo atual: boas-vindas
// (src/screens/WelcomeScreen.jsx) → terminou as 5 perguntas do onboarding
// (OnboardingFlow.jsx, passo 'result') → chegou no cadastro → criou conta
// (SignupScreen.jsx) → iniciou uma compra (UpgradeScreen.jsx). "Assinaram"
// (6ª linha do quadro) não é um evento de sessão, vem de
// subscriptions.created_at logo abaixo.
//
// Trocado em 2026-09-08: a lista antiga (name/valueIntro/features/
// prayerTime/firstTimeReading/readingPlan/reflectionTime/preview) descrevia
// o wizard de 6 perguntas que OnboardingFlow.jsx substituiu — a conta virou
// obrigatória antes de ler (2026-09-07), então a própria ordem do funil
// mudou: "criar conta" agora vem ANTES de qualquer leitura, não depois. Sem
// evento gravado desde a troca, o funil ficava mostrando quase só zero.
const FUNNEL_STEPS = ['welcome', 'result', 'signup', 'signup_completed', 'checkout_started']
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

// Segunda-feira (00:00) da semana em que "d" cai — mesma convenção de
// mondayOf() em src/routine/routineStreak.js (não importado direto pra não
// puxar o resto daquele módulo aqui; é só 4 linhas).
function mondayOf(d) {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

// "Novos assinantes por semana" (23a) — últimas `weeksBack` semanas
// (mais antiga primeiro), contando subscriptions.created_at por semana.
function weeklySignupSeries(subs, weeksBack, today = new Date()) {
  const currentWeekStart = mondayOf(today)
  const weeks = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() - i * 7)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
    const count = subs.filter(s => s.created_at && new Date(s.created_at) >= start && new Date(s.created_at) < end).length
    weeks.push({ weekStart: start.toISOString().slice(0, 10), count })
  }
  return weeks
}

// Curva de retenção por semana (S0-S7) de UMA coorte de aquisição (quem
// assinou no mês anterior ao atual) — mesma limitação honesta de
// computeRetentionCohort acima: só sabemos o status ATUAL, não o histórico
// dia a dia, então "retido na semana N" é "ainda ativo hoje E já tem pelo
// menos N semanas de conta" — não "estava ativo exatamente na semana N".
function computeRetentionByWeek(recurringSubs, today = new Date()) {
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const cohort = recurringSubs.filter(s => {
    if (!s.created_at) return false
    const d = new Date(s.created_at)
    return d >= firstOfLastMonth && d < firstOfThisMonth
  })
  const weeks = []
  for (let w = 0; w <= 7; w++) {
    const eligible = cohort.filter(s => (today.getTime() - new Date(s.created_at).getTime()) / (7 * 86400000) >= w)
    const retained = eligible.filter(s => RECURRING_ACTIVE_STATUSES.includes(s.status)).length
    weeks.push({ week: w, cohortSize: eligible.length, pct: eligible.length > 0 ? Math.round((retained / eligible.length) * 100) : null })
  }
  return { cohortMonth: firstOfLastMonth.toISOString().slice(0, 7), weeks }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const rawDays = Number(req.body?.days)
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(Math.round(rawDays), FUNNEL_WINDOW_DAYS_MAX) : FUNNEL_WINDOW_DAYS_DEFAULT
  const language = req.body?.language === 'pt' || req.body?.language === 'en' ? req.body.language : null
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date()
  const startOfTodayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const in48hIso = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

  let funnelEventsQuery = supabaseAdmin.from('onboarding_events').select('session_id, step').gte('created_at', windowStart)
  if (language) funnelEventsQuery = funnelEventsQuery.eq('language', language)

  const [
    totalUsersRes, newByDayRes, subsRes, contactTotalRes, contactUnansweredRes, funnelEventsRes,
    sessionTodayRes, chaptersTodayRes, aiChatsTodayRes, pendingReportsRes,
    groupsCountRes, groupMembersRes,
  ] = await Promise.all([
    supabaseAdmin.rpc('admin_total_users'),
    supabaseAdmin.rpc('admin_new_users_by_day', { days_back: 30 }),
    supabaseAdmin.from('subscriptions').select('user_id, access_type, status, plan, currency, amount_cents, current_period_end, created_at, updated_at'),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contact_messages').select('*', { count: 'exact', head: true }).is('replied_at', null),
    funnelEventsQuery,
    // DAU (23a) — distinto de session_seconds/chapters_read de HOJE, as
    // duas tabelas com data real por linha desde o Bloco 7 (ver
    // 0049_redesign_bloco2_dados.sql) — não existe uma tabela "sessão de
    // app aberto" à parte, então isto é "fez algo de leitura/oração/
    // reflexão hoje", um proxy honesto de ativo, não literalmente "abriu o
    // app".
    supabaseAdmin.from('session_seconds').select('user_id').gte('data', startOfTodayIso.slice(0, 10)),
    supabaseAdmin.from('chapters_read').select('user_id').gte('created_at', startOfTodayIso),
    supabaseAdmin.from('text_ai_chats').select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', startOfTodayIso),
    supabaseAdmin.from('ai_answer_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('reading_groups').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('reading_group_members').select('user_id').eq('status', 'joined'),
  ])

  const firstError = [totalUsersRes, newByDayRes, subsRes, contactTotalRes, contactUnansweredRes, funnelEventsRes, sessionTodayRes, chaptersTodayRes, aiChatsTodayRes, pendingReportsRes, groupsCountRes, groupMembersRes].find(r => r.error)
  if (firstError) {
    console.error('Failed to load admin metrics:', firstError.error.message)
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

  // Crescimento de 30 dias (23a, linha embaixo de "Assinantes ativos") —
  // fixo em 30 dias sempre, igual weeklySignupSeries, não segue o filtro
  // `days` do funil (mesma regra do comentário no topo do arquivo: os
  // cards de topo não filtram). "Novas" = criadas nos últimos 30 dias E
  // ainda ativas hoje — não é crescimento líquido (não desconta quem
  // cancelou no período), mas é honesto: todo mundo contado aqui está
  // mesmo ativo agora.
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
  const newActiveIn30d = activeRecurring.filter(s => s.created_at && new Date(s.created_at).getTime() >= Date.now() - THIRTY_DAYS_MS).length
  const newActivePct30d = activeRecurring.length > newActiveIn30d
    ? Math.round((newActiveIn30d / (activeRecurring.length - newActiveIn30d)) * 1000) / 10
    : null

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

  const trialCount = subs.filter(s => s.status === 'trialing').length
  const trialsExpiringSoon = subs.filter(s => s.status === 'trialing' && s.current_period_end && s.current_period_end <= in48hIso).length
  const paymentErrorsToday = pastDueSubs.filter(s => s.updated_at && s.updated_at >= startOfTodayIso).length

  // DAU (proxy honesto — ver comentário na consulta acima).
  const dauSet = new Set([...(sessionTodayRes.data ?? []).map(r => r.user_id), ...(chaptersTodayRes.data ?? []).map(r => r.user_id)])

  const weeklySignups = weeklySignupSeries(subs, 12, now)
  const retentionByWeek = computeRetentionByWeek(recurringSubs, now)

  // Grupos e igrejas (23a) — "quem está em grupo retém quanto mais" é o
  // argumento de produto mais importante do painel (ver nota do mockup),
  // por isso os dois números vêm juntos aqui.
  const groupMemberIds = new Set((groupMembersRes.data ?? []).map(r => r.user_id))
  const subscribersInGroup = activeRecurring.filter(s => groupMemberIds.has(s.user_id)).length
  const pctSubscribersInGroup = activeRecurring.length > 0 ? Math.round((subscribersInGroup / activeRecurring.length) * 100) : 0
  const retentionInGroup = computeRetentionCohort(recurringSubs.filter(s => groupMemberIds.has(s.user_id)), 30, 90)
  const retentionSolo = computeRetentionCohort(recurringSubs.filter(s => !groupMemberIds.has(s.user_id)), 30, 90)
  const groupRetentionMultiplier = retentionInGroup.pct != null && retentionSolo.pct != null && retentionSolo.pct > 0
    ? Math.round((retentionInGroup.pct / retentionSolo.pct) * 10) / 10
    : null

  return res.status(200).json({
    users: {
      total: totalUsersRes.data ?? 0,
      newByDay: newByDayRes.data ?? [],
    },
    subscriptions: {
      mrrCents: { brl: Math.round(mrrCents.brl), usd: Math.round(mrrCents.usd) },
      activeByPlan,
      activeTotal: activeRecurring.length,
      newActiveIn30d,
      newActivePct30d,
      free,
      lifetime,
      trialCount,
      trialsExpiringSoon,
    },
    contact: {
      total: contactTotalRes.count ?? 0,
      unanswered: contactUnansweredRes.count ?? 0,
      answered: (contactTotalRes.count ?? 0) - (contactUnansweredRes.count ?? 0),
    },
    pastDueSubscriptions,
    paymentErrorsToday,
    retention,
    retentionByWeek,
    weeklySignups,
    dau: dauSet.size,
    ai: {
      questionsToday: aiChatsTodayRes.count ?? 0,
      pendingReports: pendingReportsRes.count ?? 0,
    },
    groups: {
      activeCount: groupsCountRes.count ?? 0,
      pctSubscribersInGroup,
      retentionMultiplier: groupRetentionMultiplier,
    },
    onboardingFunnel: {
      windowDays: days,
      language,
      steps: funnel,
      subscribed: subscribedCount,
      subscribedPct: pctOf(subscribedCount),
    },
  })
}
