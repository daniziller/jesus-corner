// Confirma uma compra feita via Google Play Billing (Digital Goods API
// dentro do TWA — ver startPlayBillingPurchase em
// src/billing/subscriptionStore.js). Nunca confia no purchaseToken sozinho:
// sempre re-verifica contra a Play Developer API antes de liberar acesso.
// Mesmo padrão de api/activate-free-access.js — client anon-scoped confirma
// quem é o chamador, depois client service-role grava (a tabela
// subscriptions não libera INSERT/UPDATE pra usuário comum).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSubscriptionPurchase, mapPlaySubscriptionState } from './_lib/googlePlay.js'
import { STORE_TIERS } from '../src/billing/storeTiers.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Nunca confiar em valor/moeda vindos do cliente — só no sku, validado
// contra este registro (a mesma fonte usada pra montar a tela de
// assinatura, ver src/billing/storeTiers.js).
function findTierBySku(sku) {
  for (const mode of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[mode].googlePlaySku === sku) return { ...STORE_TIERS[mode], mode }
  }
  return null
}

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

  const { purchaseToken, sku } = req.body ?? {}
  if (!purchaseToken || !sku) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const tier = findTierBySku(sku)
  if (!tier) {
    return res.status(400).json({ error: 'unknown_sku' })
  }

  let purchase
  try {
    purchase = await getSubscriptionPurchase(purchaseToken)
  } catch (err) {
    console.error('Failed to verify Google Play purchase:', err.message)
    return res.status(400).json({ error: 'verification_failed' })
  }

  // A compra precisa ter sido feita por quem está chamando — obfuscatedAccountId
  // foi mandado no momento da compra (ver startPlayBillingPurchase) exatamente
  // pra permitir essa checagem aqui.
  const accountId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId
  if (accountId && accountId !== caller.id) {
    return res.status(403).json({ error: 'account_mismatch' })
  }

  // Quem já tinha assinatura Stripe ativa e comprou pelo Play não deve
  // continuar sendo cobrado nos dois — mesma proteção que
  // activate-free-access.js já aplica.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id, status')
    .eq('user_id', caller.id)
    .maybeSingle()
  if (existing?.stripe_subscription_id && existing.status !== 'canceled') {
    await stripe.subscriptions.cancel(existing.stripe_subscription_id).catch((err) => {
      console.error('Failed to cancel previous Stripe subscription:', err.message)
    })
  }

  const status = mapPlaySubscriptionState(purchase.subscriptionState)
  const lineItem = purchase.lineItems?.[0]
  const currentPeriodEnd = lineItem?.expiryTime ?? null
  // Play decide a moeda pelo país da conta de quem compra, não por escolha
  // manual (diferente do Stripe) — regionCode é o melhor proxy disponível
  // na resposta da subscriptionsv2.get pra isso. CONFERIR contra a
  // documentação atual: se a API expuser a moeda cobrada diretamente em
  // algum campo, preferir isso a essa heurística por região.
  const currency = purchase.regionCode === 'BR' ? 'brl' : 'usd'

  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: caller.id,
    billing_provider: 'google_play',
    google_play_purchase_token: purchaseToken,
    google_play_product_id: sku,
    google_play_order_id: purchase.latestOrderId ?? null,
    access_type: 'recurring',
    plan: tier.mode === 'annual' ? 'annual' : 'monthly',
    status,
    amount_cents: Math.round(tier[currency] * 100),
    currency,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    console.error('Failed to save Google Play subscription:', upsertErr.message)
    return res.status(500).json({ error: 'save_failed' })
  }

  return res.status(200).json({ ok: true })
}
