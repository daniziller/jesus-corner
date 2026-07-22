// Ativa acesso gratuito (R$0) — nunca toca o Stripe. Confirma quem é o
// chamador com um client escopado por RLS (só lê a própria linha), depois
// troca pro client service-role só pra gravar (a tabela subscriptions não
// libera INSERT/UPDATE pra usuário comum — só o service role escreve, ver
// comentário em supabase/migrations/0016_subscriptions.sql).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const caller = userData.user

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', caller.id)
    .maybeSingle()

  // Quem tinha assinatura paga e voltou pro grátis não deve continuar
  // sendo cobrado.
  if (existing?.stripe_subscription_id && existing.status !== 'canceled') {
    await stripe.subscriptions.cancel(existing.stripe_subscription_id).catch((err) => {
      console.error('Failed to cancel previous subscription:', err.message)
    })
  }

  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: caller.id,
    access_type: 'free',
    plan: 'free',
    status: 'active',
    amount_cents: 0,
    currency: null,
    current_period_end: null,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    console.error('Failed to activate free access:', upsertErr.message)
    return res.status(500).json({ error: 'activation_failed' })
  }

  return res.status(200).json({ ok: true })
}
