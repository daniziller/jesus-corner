// Recebe eventos do Stripe (não passa pela auth de sessão — é o Stripe
// quem chama isso direto, autenticado pela assinatura HMAC do webhook, não
// por Bearer token). Único lugar que escreve na tabela subscriptions,
// usando a service role key (bypassa RLS de propósito — ver
// supabase/migrations/0016_subscriptions.sql pro motivo de segurança:
// nenhum client autenticado pode escrever ali, só isso aqui).
//
// bodyParser desligado de propósito: a verificação de assinatura do Stripe
// precisa do corpo bruto da requisição, byte a byte — se o Vercel já
// parseasse pra JSON antes, a assinatura não bateria mais.
export const config = { api: { bodyParser: false } }

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// apiVersion fixado pra bater com o que a conta Stripe já usa (checado via
// header stripe-version numa chamada de teste) — evita o SDK e a conta
// divergirem sobre o formato dos objetos (ex: onde current_period_end mora
// na Subscription, que mudou de lugar entre versões da API do Stripe).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function planFromInterval(interval) {
  return interval === 'year' ? 'annual' : 'monthly'
}

async function upsertFromSubscription(subscription) {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('Stripe subscription missing supabase_user_id metadata:', subscription.id)
    return
  }
  const item = subscription.items?.data?.[0]
  const plan = subscription.metadata?.plan ?? planFromInterval(item?.price?.recurring?.interval)
  // Tier vem do metadata gravado em api/create-checkout-session.js. Sem ele
  // (assinaturas antigas, criadas quando havia plano único), assume o
  // pacote completo — era o que aquele plano dava.
  const tier = subscription.metadata?.tier === 'premium' ? 'premium' : 'premium_ai'
  // Nas versões atuais da API do Stripe, current_period_end mora no item da
  // assinatura, não mais na Subscription — mas mantém o fallback pro campo
  // antigo pra não quebrar se a conta usar uma apiVersion mais velha.
  const periodEndSeconds = item?.current_period_end ?? subscription.current_period_end

  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan,
    tier,
    access_type: 'recurring',
    amount_cents: item?.price?.unit_amount ?? null,
    currency: item?.price?.currency ?? null,
    current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('Failed to upsert subscription:', error.message)
}

// Pagamento único (acesso vitalício) não cria Subscription no Stripe, então
// não dá pra reaproveitar upsertFromSubscription — grava direto a partir da
// própria Checkout Session.
async function upsertFromOneTimeSession(session) {
  const userId = session.metadata?.supabase_user_id || session.client_reference_id
  if (!userId) {
    console.error('Stripe one-time checkout session missing supabase_user_id:', session.id)
    return
  }

  const { error } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: session.customer,
    stripe_subscription_id: null,
    status: 'active',
    plan: 'lifetime',
    tier: 'premium_ai',
    access_type: 'lifetime',
    amount_cents: session.amount_total,
    currency: session.currency,
    current_period_end: null,
    updated_at: new Date().toISOString(),
  })
  if (error) console.error('Failed to upsert lifetime access:', error.message)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const signature = req.headers['stripe-signature']
  const rawBody = await readRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          await upsertFromSubscription(subscription)
          // Só cancela a assinatura antiga (troca de valor/periodicidade)
          // depois que a nova já está confirmada e gravada — ver o
          // comentário em api/create-checkout-session.js sobre por que essa
          // ordem importa (evita ficar sem assinatura nenhuma se o checkout
          // for abandonado).
          const previousId = session.metadata?.previous_subscription_id
          if (previousId && previousId !== subscription.id) {
            await stripe.subscriptions.cancel(previousId).catch((err) => {
              console.error('Failed to cancel previous subscription after upgrade:', err.message)
            })
          }
        } else if (session.mode === 'payment' && session.payment_status === 'paid') {
          await upsertFromOneTimeSession(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object)
        break
      }
      default:
        break
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Stripe webhook handling error:', err.message)
    return res.status(500).json({ error: 'webhook_handler_failed' })
  }
}
