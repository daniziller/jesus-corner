// Cria uma Stripe Checkout Session pra quem já está logado no app — modelo
// de valor livre: a pessoa escolhe o valor (nunca R$0/US$0 aqui, isso é
// tratado sem Stripe em api/activate-free-access.js), recorrente mensal ou
// pagamento único (acesso vitalício). Runtime Node (não edge, diferente de
// invite-friend.js) — o SDK oficial `stripe` tem suporte Node completo pra
// tudo que os endpoints de pagamento precisam, sem reimplementar nada
// manualmente.
//
// Moeda escolhida pela pessoa na tela (BRL ou USD) — não dá pra confiar só
// na geolocalização por IP (x-vercel-ip-country, ainda usado como sugestão
// inicial em UpgradeScreen.jsx): um cartão de banco brasileiro usado fora
// do Brasil, ou o inverso, tem a moeda "certa" pelo IP mas recusada pela
// rede do cartão — foi exatamente esse erro real que apareceu em produção.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const APP_URL = 'https://app.jesuscorner.app'

// Cobrança mínima real do Stripe por moeda (não dá pra cobrar menos que
// isso) — valores abaixo disso só fazem sentido como R$0 (grátis).
const MIN_CHARGE_CENTS = { brl: 50, usd: 50 }
// Contribuição única (vitalício) não aceita R$0 — regra de negócio, mínimo
// bem mais alto que o piso técnico do Stripe acima. Mesmo valor numérico
// pras duas moedas (200), sem conversão de câmbio.
const MIN_ONETIME_CENTS = { brl: 20000, usd: 20000 }

// Cache de módulo — sobrevive entre invocações "quentes" da function.
// Evita criar um Product novo no Stripe a cada checkout (o que aconteceria
// se usássemos price_data.product_data em vez de price_data.product) ao
// reaproveitar um Product já existente. STRIPE_PRODUCT_ID (direto, sem
// round-trip à API) é o caminho preferido; na ausência dele, cai pro
// caminho antigo de derivar o Product a partir do Price mensal legado —
// mantém ambiente sem STRIPE_PRODUCT_ID configurado (ex: Preview, ainda em
// modo teste) funcionando sem precisar mexer em nada.
let cachedProductId = null
async function getOrFetchProductId() {
  if (cachedProductId) return cachedProductId
  if (process.env.STRIPE_PRODUCT_ID) {
    cachedProductId = process.env.STRIPE_PRODUCT_ID
    return cachedProductId
  }
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_MONTHLY)
  cachedProductId = price.product
  return cachedProductId
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

  const { type, interval: requestedInterval, amountCents, currency: requestedCurrency } = req.body ?? {}
  if (type !== 'onetime' && type !== 'recurring') {
    return res.status(400).json({ error: 'invalid_type' })
  }
  // Mensal ou anual — só importa quando type é 'recurring'; default 'month'
  // se vier algo inválido/ausente.
  const interval = requestedInterval === 'year' ? 'year' : 'month'

  // Confia na escolha explícita da pessoa; só cai pro IP se o corpo não
  // mandar nada (cliente antigo em cache, por exemplo).
  const currency = requestedCurrency === 'brl' || requestedCurrency === 'usd'
    ? requestedCurrency
    : (req.headers['x-vercel-ip-country'] === 'BR' ? 'brl' : 'usd')

  const minCents = type === 'onetime' ? MIN_ONETIME_CENTS[currency] : MIN_CHARGE_CENTS[currency]
  if (!Number.isInteger(amountCents) || amountCents < minCents) {
    return res.status(400).json({ error: 'amount_too_low', minCents })
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
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
    const productId = await getOrFetchProductId()

    // Trocar de valor recorrente, ou passar a pagar uma vez só (vitalício),
    // cancela a assinatura recorrente antiga antes de criar a nova cobrança
    // — pra nunca ficar cobrando duas ao mesmo tempo.
    if (existing?.stripe_subscription_id && existing.status !== 'canceled') {
      await stripe.subscriptions.cancel(existing.stripe_subscription_id).catch((err) => {
        console.error('Failed to cancel previous subscription:', err.message)
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: type === 'recurring' ? 'subscription' : 'payment',
      customer: customerId,
      client_reference_id: caller.id,
      currency,
      metadata: { supabase_user_id: caller.id, access_type: type === 'recurring' ? 'recurring' : 'lifetime' },
      line_items: [{
        price_data: {
          currency,
          unit_amount: amountCents,
          product: productId,
          ...(type === 'recurring' ? { recurring: { interval } } : {}),
        },
        quantity: 1,
      }],
      ...(type === 'recurring'
        ? { subscription_data: { metadata: { supabase_user_id: caller.id, access_type: 'recurring' } } }
        : {}),
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
