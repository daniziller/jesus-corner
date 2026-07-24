import { supabase } from '../lib/supabaseClient'
import { Capacitor, registerPlugin } from '@capacitor/core'

// A linha de subscriptions do usuário logado — RLS já filtra pra só a
// própria linha (user_id é a PK, ver supabase/migrations/0016_subscriptions.sql),
// então um select sem filtro nenhum já devolve exatamente isso. null se a
// pessoa nunca assinou (nenhuma linha ainda).
export async function getMySubscription() {
  const { data, error } = await supabase.from('subscriptions').select('*').maybeSingle()
  if (error) {
    console.error('Failed to fetch subscription', error)
    return null
  }
  return data
}

export function isPremiumActive(subscription) {
  if (!subscription) return false
  // Grátis e vitalício não têm ciclo de cobrança — uma vez ativados, ficam
  // ativos pra sempre (não existe "trialing"/"past_due" pra esses tipos).
  if (subscription.access_type === 'free' || subscription.access_type === 'lifetime') {
    return subscription.status === 'active'
  }
  return subscription.status === 'active' || subscription.status === 'trialing'
}

async function authorizedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  return res.json()
}

// Devolve a URL do Stripe Checkout — quem chamar é responsável por
// redirecionar (window.location.href = url), já que isso sai do domínio do app.
// interval: 'month' ou 'year'. amountCents sempre > 0 — R$0 não passa por
// aqui, ver activateFreeAccess. currency: 'brl' ou 'usd', escolhida pela
// pessoa na tela — não dá pra confiar só na geolocalização por IP pra isso
// (cartão de banco brasileiro usado fora do Brasil, ou vice-versa, quebra
// a cobrança na moeda errada).
export async function startCheckout({ interval, amountCents, currency }) {
  const { url } = await authorizedPost('/api/create-checkout-session', { interval, amountCents, currency })
  return url
}

// Ativa acesso gratuito (R$0) — não envolve o Stripe, não redireciona.
export async function activateFreeAccess() {
  return authorizedPost('/api/activate-free-access')
}

// Devolve a URL do Stripe Billing Portal (cancelar/trocar cartão/ver fatura).
export async function openBillingPortalUrl() {
  const { url } = await authorizedPost('/api/create-portal-session')
  return url
}

// ─── Google Play Billing (dentro do TWA instalado via Play) ───────────────
//
// A Digital Goods API só existe dentro do TWA instalado a partir da Play
// Store — nunca em navegador comum, nem no PWA "adicionar à tela inicial".
// Cacheado em módulo porque a checagem não muda durante a sessão.
let _digitalGoodsPromise = null
export function getDigitalGoodsService() {
  if (!_digitalGoodsPromise) {
    _digitalGoodsPromise = (!('getDigitalGoodsService' in window))
      ? Promise.resolve(null)
      : window.getDigitalGoodsService('https://play.google.com/billing').catch(() => null)
  }
  return _digitalGoodsPromise
}

// Preço localizado de verdade (o que o Play vai cobrar) pros SKUs pedidos —
// usar isso pra exibir valor, nunca o `value` estático de storeTiers.js,
// que é só o rótulo/nome do tier, não necessariamente o preço exibido em
// todo país.
export async function getPlaySkuDetails(skus) {
  const service = await getDigitalGoodsService()
  if (!service) return {}
  const details = await service.getDetails(skus)
  return Object.fromEntries(details.map(d => [d.itemId, d.price]))
}

// Inicia uma compra via PaymentRequest + Digital Goods API. Diferente de
// startCheckout, não devolve URL — a compra resolve dentro da própria
// página. obfuscatedAccountId vincula a compra ao usuário logado, pro
// backend confirmar depois (ver api/verify-google-play-purchase.js) que o
// token pertence mesmo a quem está chamando — nunca confiamos no
// purchaseToken sozinho.
export async function startPlayBillingPurchase({ sku, mode }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const methodData = [{
    supportedMethods: 'https://play.google.com/billing',
    data: { sku, obfuscatedAccountId: user.id },
  }]
  const details = { total: { label: 'Total', amount: { currency: 'BRL', value: '0' } } }
  const request = new PaymentRequest(methodData, details)

  let response
  try {
    response = await request.show()
  } catch {
    throw new Error('user_cancelled')
  }
  const { purchaseToken } = response.details
  await response.complete('success')
  return authorizedPost('/api/verify-google-play-purchase', { purchaseToken, sku, mode })
}

// ─── Apple StoreKit (app iOS via Capacitor) ────────────────────────────────
//
// StoreKitPlugin é um plugin Capacitor nativo (ver ios/App/App/StoreKitPlugin.swift)
// — só existe de verdade dentro do app iOS empacotado, nunca no navegador.
export function isIOSApp() {
  return Capacitor.getPlatform() === 'ios'
}

const StoreKitPlugin = registerPlugin('StoreKitPlugin')

// productIds: lista de com.jesuscorner.app.monthly.10 etc (ver storeTiers.js).
// Devolve preço localizado real (o que a App Store vai cobrar), mesma ideia
// de getPlaySkuDetails.
export async function getIOSProducts(productIds) {
  if (!isIOSApp()) return {}
  const { products } = await StoreKitPlugin.getProducts({ productIds })
  return Object.fromEntries((products ?? []).map(p => [p.productId, { value: p.price, currency: p.currencyCode }]))
}

// Inicia a compra nativa via StoreKit 2. finishTransaction só é chamado
// depois que o backend confirmar a verificação (ver StoreKitPlugin.swift) —
// nunca antes, pra não perder a chance de reentrega se a verificação falhar
// no meio do caminho.
export async function startIOSPurchase({ productId, mode }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')

  const { transactionId, jws } = await StoreKitPlugin.purchase({ productId, appAccountToken: user.id })
  const result = await authorizedPost('/api/verify-apple-purchase', { transactionId, jws, productId, mode })
  await StoreKitPlugin.finishTransaction({ transactionId }).catch(err => {
    console.error('Failed to finish StoreKit transaction after verification', err)
  })
  return result
}

// ─── Gerenciar assinatura — provider-aware ─────────────────────────────────
//
// Usado tanto em UpgradeScreen.jsx quanto em ProfileScreen.jsx, pra não
// duplicar a ramificação por billing_provider nos dois lugares. Assinaturas
// via loja não têm portal próprio como o do Stripe — só dá pra gerenciar
// pelo app oficial da loja (Play Store / Ajustes do iOS), não por uma URL
// que o Jesus' Corner controla.
export async function getManageSubscriptionUrl(subscription) {
  if (subscription?.billing_provider === 'google_play') {
    return 'https://play.google.com/store/account/subscriptions?package=com.jesuscorner.app'
  }
  if (subscription?.billing_provider === 'apple') {
    return 'https://apps.apple.com/account/subscriptions'
  }
  return openBillingPortalUrl()
}
