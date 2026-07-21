// Concede premium manualmente (sem passar pelo Stripe) — uso pontual do
// dono do app pra comp/cortesia de acesso, protegido checando que quem
// chama é um dos ADMIN_EMAILS. Grava direto na tabela subscriptions via
// service role (mesmo client do webhook, ver api/stripe-webhook.js), já
// que RLS bloqueia qualquer escrita de authenticated/anon.
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['daniziller@hotmail.com']

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (callerErr || !callerData?.user || !ADMIN_EMAILS.includes(callerData.user.email)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const { email, months = 12 } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'missing_email' })
  }

  // GET /admin/users?email= não filtra de fato no servidor — busca todas as
  // páginas e filtra no cliente pra não pegar o usuário errado por engano.
  let targetUser = null
  for (let page = 1; page <= 10 && !targetUser; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return res.status(500).json({ error: 'list_users_failed', detail: error.message })
    targetUser = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (data.users.length < 200) break
  }
  if (!targetUser) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + Number(months))

  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: targetUser.id,
    status: 'active',
    plan: 'annual',
    current_period_end: periodEnd.toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    return res.status(500).json({ error: 'upsert_failed', detail: upsertErr.message })
  }

  return res.status(200).json({ ok: true, user_id: targetUser.id, current_period_end: periodEnd.toISOString() })
}
