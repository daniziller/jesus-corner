// Cron job (ver vercel.json) — roda 1x por dia e, pra cada assinante
// recorrente cujo valor equivalente mensal está abaixo de R$20/US$20 (sem
// conversão entre moedas, mesmo padrão do resto do app — ver
// src/screens/UpgradeScreen.jsx), cria uma notificação lembrando que
// contribuições maiores ajudam o app a chegar em mais gente. Cada pessoa
// recebe no máximo 1 lembrete a cada 15 dias, e só enquanto continuar
// abaixo do limite — quem aumentar o valor para de receber
// automaticamente, já que a query abaixo simplesmente para de selecionar
// essa linha.
//
// Só o Vercel Cron deve conseguir chamar isso — ele manda automaticamente
// `Authorization: Bearer $CRON_SECRET` quando essa env var está configurada
// no projeto (ver https://vercel.com/docs/cron-jobs/manage-cron-jobs).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const MONTHLY_THRESHOLD_CENTS = 2000
const REMINDER_INTERVAL_DAYS = 15
const NOTIFICATION_TYPE = 'contribution_reminder'

const COPY = {
  pt: {
    title: "Sua contribuição ajuda o Jesus' Corner a crescer",
    body: 'Contribuições maiores ajudam o Jesus\' Corner a chegar em mais gente. Quer revisar o valor da sua contribuição atual?',
  },
  en: {
    title: "Your contribution helps Jesus' Corner grow",
    body: "Bigger contributions help Jesus' Corner reach more people. Want to review your current contribution amount?",
  },
}

function monthlyEquivalentCents(sub) {
  if (sub.amount_cents == null) return null
  return sub.plan === 'annual' ? sub.amount_cents / 12 : sub.amount_cents
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { data: subs, error: subsErr } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, amount_cents')
    .eq('access_type', 'recurring')
    .in('status', ['active', 'trialing'])
    .not('amount_cents', 'is', null)

  if (subsErr) {
    console.error('Failed to load subscriptions for reminders:', subsErr.message)
    return res.status(500).json({ error: 'query_failed' })
  }

  const eligible = (subs ?? []).filter(s => {
    const monthly = monthlyEquivalentCents(s)
    return monthly != null && monthly < MONTHLY_THRESHOLD_CENTS
  })

  const cutoff = new Date(Date.now() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  let sent = 0
  let skipped = 0

  for (const sub of eligible) {
    const { data: recent, error: recentErr } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('user_id', sub.user_id)
      .eq('type', NOTIFICATION_TYPE)
      .gte('created_at', cutoff)
      .limit(1)

    if (recentErr) {
      console.error('Failed to check recent reminders for', sub.user_id, recentErr.message)
      continue
    }
    if (recent?.length > 0) { skipped++; continue }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
    if (userErr || !userData?.user) {
      console.error('Failed to load user for reminder', sub.user_id, userErr?.message)
      continue
    }
    const lang = userData.user.user_metadata?.language === 'en' ? 'en' : 'pt'
    const copy = COPY[lang]

    const { error: insertErr } = await supabaseAdmin.from('notifications').insert({
      user_id: sub.user_id,
      type: NOTIFICATION_TYPE,
      title: copy.title,
      body: copy.body,
    })
    if (insertErr) {
      console.error('Failed to insert reminder for', sub.user_id, insertErr.message)
      continue
    }
    sent++
  }

  return res.status(200).json({ ok: true, eligible: eligible.length, sent, skipped })
}
