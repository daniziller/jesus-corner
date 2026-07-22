// Cria uma Stripe Checkout Session (assinatura) pra quem já está logado no
// app. Runtime Node (não edge, diferente de invite-friend.js) — o SDK
// oficial `stripe` tem suporte Node completo pra tudo que os endpoints de
// pagamento precisam, sem reimplementar nada manualmente.
//
// Moeda decidida pelo mesmo header de geolocalização que api/geo.js já usa
// (x-vercel-ip-country): Brasil paga em BRL, resto do mundo em USD — os 2
// Prices no Stripe (mensal/anual) têm currency_options pras duas moedas.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY,
  annual: process.env.STRIPE_PRICE_ANNUAL,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // Client "escopado" ao usuário que chamou — só enxerga (RLS) a própria
  // linha em subscriptions, exatamente o que essa função precisa (reaproveitar
  // um stripe_customer_id já existente, se houver, pra não duplicar Customer
  // no Stripe a cada checkout que a pessoa começar e abandonar).
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  const caller = userData.user

  const { plan } = req.body ?? {}
  const priceId = PRICE_IDS[plan]
  if (!priceId) {
    return res.status(400).json({ error: 'invalid_plan' })
  }

  const country = req.headers['x-vercel-ip-country']
  const currency = country === 'BR' ? 'brl' : 'usd'

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', caller.id)
    .maybeSingle()

  let customerId = existing?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: caller.email,
      metadata: { supabase_user_id: caller.id },
    })
    customerId = customer.id
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: caller.id,
      currency,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { supabase_user_id: caller.id, plan } },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/?checkout=cancel`,
    })
    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err.message)
    return res.status(502).json({ error: 'checkout_failed' })
  }
}
