// Cria uma Stripe Checkout Session pra quem já está logado no app — modelo
// de assinatura com preço fixo (2 planos: mensal e anual, em BRL ou USD).
// Nunca confia em valor mandado pelo cliente: o preço vem sempre desta
// tabela fixa, calculada aqui no servidor a partir de interval/currency
// (essas sim são escolhas legítimas de UI). Contribuição única (pagamento
// avulso, acesso vitalício) foi descontinuada — só sobrevive o tratamento
// de quem já tinha (ver api/stripe-webhook.js e
// src/billing/subscriptionStore.js). Runtime Node (não edge, diferente de
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
// admin_invites tem RLS sem nenhuma policy (ver 0021_admin_invites.sql) —
// só o service role consegue ler, mesmo pra buscar o próprio convite de
// quem está comprando.
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Fonte única dos preços fixos cobrados via Stripe/web — mesmos valores
// exibidos em src/screens/UpgradeScreen.jsx e no site (jesus-corner-site).
// R$16,90/mês · R$169,90/ano · US$6,90/mês · US$69,90/ano.
const FIXED_PRICES_CENTS = {
  brl: { month: 1690, year: 16990 },
  usd: { month: 690, year: 6990 },
}

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

  const { interval: requestedInterval, currency: requestedCurrency } = req.body ?? {}
  // Mensal ou anual, default 'month' se vier algo inválido/ausente.
  const interval = requestedInterval === 'year' ? 'year' : 'month'

  // Confia na escolha explícita da pessoa; só cai pro IP se o corpo não
  // mandar nada (cliente antigo em cache, por exemplo).
  const currency = requestedCurrency === 'brl' || requestedCurrency === 'usd'
    ? requestedCurrency
    : (req.headers['x-vercel-ip-country'] === 'BR' ? 'brl' : 'usd')

  // Preço fixo — nunca vem do cliente, sempre desta tabela.
  const amountCents = FIXED_PRICES_CENTS[currency][interval]

  // Convite de desconto pendente pro e-mail de quem está comprando (ver
  // api/admin/create-invite.js) — aplica o Coupon direto na sessão, sem
  // precisar digitar código. `discounts` e `allow_promotion_codes` são
  // mutuamente exclusivos na API do Stripe, por isso só um dos dois é usado.
  const { data: pendingDiscount } = await supabaseAdmin
    .from('admin_invites')
    .select('id, stripe_coupon_id')
    .eq('kind', 'discount')
    .eq('status', 'pending')
    .ilike('email', caller.email)
    .maybeSingle()

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('user_id', caller.id)
    .maybeSingle()

  // Confirma que o customer salvo ainda existe NESTE modo (test/live não se
  // misturam no Stripe — um customer_id salvo em modo teste, por exemplo,
  // simplesmente não existe pra uma chamada com chave live, e vice-versa).
  // Sem essa checagem, contas que assinaram antes de uma troca de chave
  // ficam travadas: o checkout tentaria reaproveitar um customer inválido.
  let customerId = existing?.stripe_customer_id
  if (customerId) {
    const stillValid = await stripe.customers.retrieve(customerId).then(c => !c.deleted).catch(() => false)
    if (!stillValid) customerId = null
  }
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: caller.email,
      metadata: { supabase_user_id: caller.id },
    })
    customerId = customer.id
  }

  try {
    const productId = await getOrFetchProductId()

    // Trocar de valor ou de periodicidade precisa cancelar a assinatura
    // antiga — mas só DEPOIS que a nova for confirmada (ver
    // api/stripe-webhook.js, checkout.session.completed), nunca aqui na
    // criação da sessão: cancelar de antemão deixava a pessoa sem assinatura
    // nenhuma caso ela abandonasse o checkout (fechasse a aba, clicasse
    // "voltar" na página do Stripe etc.) — a antiga já tinha sido cancelada
    // e nenhuma nova chegou a ser criada. Só guarda o id aqui, pro webhook
    // cancelar quando (e se) a nova assinatura de fato existir.
    const previousSubscriptionId = (existing?.stripe_subscription_id && existing.status !== 'canceled')
      ? existing.stripe_subscription_id
      : null

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: caller.id,
      currency,
      metadata: {
        supabase_user_id: caller.id,
        access_type: 'recurring',
        ...(previousSubscriptionId ? { previous_subscription_id: previousSubscriptionId } : {}),
      },
      line_items: [{
        price_data: {
          currency,
          unit_amount: amountCents,
          product: productId,
          recurring: { interval },
        },
        quantity: 1,
      }],
      subscription_data: { metadata: { supabase_user_id: caller.id, access_type: 'recurring' } },
      // discounts e allow_promotion_codes são mutuamente exclusivos na API
      // do Stripe — com convite pendente, aplica o coupon automaticamente
      // (sem precisar digitar nada); sem convite, mantém o campo nativo de
      // código promocional pra quem tiver um código pra digitar.
      ...(pendingDiscount
        ? { discounts: [{ coupon: pendingDiscount.stripe_coupon_id }] }
        : { allow_promotion_codes: true }),
      success_url: `${APP_URL}/?checkout=success`,
      cancel_url: `${APP_URL}/?checkout=cancel`,
    })

    if (pendingDiscount) {
      await supabaseAdmin
        .from('admin_invites')
        .update({ status: 'claimed', claimed_by: caller.id, claimed_at: new Date().toISOString() })
        .eq('id', pendingDiscount.id)
        .eq('status', 'pending')
        .then(({ error }) => {
          if (error) console.error('Failed to mark discount invite as claimed:', error.message)
        })
    }

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout session error:', err.message)
    return res.status(502).json({ error: 'checkout_failed' })
  }
}
