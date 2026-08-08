// Confirma uma compra feita via StoreKit 2 no app iOS (ver
// startIOSPurchase em src/billing/subscriptionStore.js e o plugin nativo
// em ios/App/App/StoreKitPlugin.swift). Mesmo padrão de
// api/verify-google-play-purchase.js: nunca confia no transactionId/JWS
// sozinho, sempre re-verifica contra a App Store Server API antes de
// liberar acesso.
//
// FLAG: sem Xcode nesta máquina, esta rota nunca foi testada ponta a
// ponta com uma compra Sandbox de verdade — revisar com cuidado antes de
// confiar em produção (ver aviso em api/_lib/apple.js).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSubscriptionStatuses, decodeSignedTransaction, mapAppleSubscriptionState } from './_lib/apple.js'
import { STORE_TIERS } from '../src/billing/storeTiers.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function findTierByProductId(productId) {
  for (const mode of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[mode].appleProductId === productId) return { ...STORE_TIERS[mode], mode }
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

  const { jws, productId } = req.body ?? {}
  if (!jws || !productId) {
    return res.status(400).json({ error: 'missing_fields' })
  }

  const tier = findTierByProductId(productId)
  if (!tier) {
    return res.status(400).json({ error: 'unknown_product' })
  }

  let decoded
  try {
    decoded = await decodeSignedTransaction(jws)
  } catch (err) {
    console.error('Failed to decode Apple transaction JWS:', err.message)
    return res.status(400).json({ error: 'verification_failed' })
  }

  // appAccountToken foi mandado no momento da compra (ver startIOSPurchase)
  // exatamente pra permitir essa checagem — a compra precisa pertencer a
  // quem está chamando.
  if (decoded.appAccountToken && decoded.appAccountToken !== caller.id) {
    return res.status(403).json({ error: 'account_mismatch' })
  }

  const originalTransactionId = decoded.originalTransactionId
  let statusResponse
  try {
    statusResponse = await getSubscriptionStatuses(originalTransactionId)
  } catch (err) {
    console.error('Failed to fetch Apple subscription status:', err.message)
    return res.status(400).json({ error: 'verification_failed' })
  }

  // FLAG: a forma exata de achar "o status relevante" dentro da resposta
  // de getAllSubscriptionStatuses (agrupada por subscription group, pode
  // ter mais de um item) precisa ser confirmada contra a documentação —
  // aqui assume o primeiro item do primeiro grupo.
  const rawStatus = statusResponse?.data?.[0]?.lastTransactions?.[0]?.status
  const status = mapAppleSubscriptionState(rawStatus)

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

  // Apple decide a moeda pelo país da conta da App Store, não por escolha
  // manual — decoded.currency (ISO 4217, ex "USD"/"BRL") é o campo mais
  // provável na transação decodificada; CONFERIR o nome exato do campo.
  const currency = (decoded.currency ?? 'USD').toLowerCase()

  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: caller.id,
    billing_provider: 'apple',
    apple_original_transaction_id: originalTransactionId,
    apple_product_id: productId,
    access_type: 'recurring',
    plan: tier.mode === 'annual' ? 'annual' : 'monthly',
    status,
    amount_cents: Math.round((tier[currency] ?? tier.usd) * 100),
    currency,
    current_period_end: decoded.expiresDate ? new Date(decoded.expiresDate).toISOString() : null,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    console.error('Failed to save Apple subscription:', upsertErr.message)
    return res.status(500).json({ error: 'save_failed' })
  }

  return res.status(200).json({ ok: true })
}
