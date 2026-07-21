// Cria uma sessão do Stripe Billing Portal (hospedado pelo próprio Stripe)
// pra quem já é assinante gerenciar/cancelar a assinatura ou ver faturas —
// evita construir essa tela do zero. Ver api/create-checkout-session.js
// pro mesmo padrão de auth (client Supabase escopado ao usuário chamador).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

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

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'no_subscription' })
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/?tab=profile`,
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal session error:', err.message)
    return res.status(502).json({ error: 'portal_failed' })
  }
}
