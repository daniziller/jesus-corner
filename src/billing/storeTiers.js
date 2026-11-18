// Única fonte de verdade do preço do plano pago — o mesmo valor cobrado nas
// lojas (Google Play Billing / Apple StoreKit) e no Stripe/web (ver
// api/create-checkout-session.js, que lê PAID_PLAN daqui). `usd`/`brl`
// também alimentam o `amount_cents` gravado em `subscriptions` nas duas
// verificações de compra (verify-apple-purchase.js,
// verify-google-play-purchase.js) — usado no MRR do admin — então precisam
// bater com o preço REAL configurado em cada loja.
//
// Pedido dela (2026-11-18): só duas versões do app — a grátis, com recursos
// limitados, e UM plano pago, mensal: R$27 no Brasil, US$7 no resto do
// mundo. Acabaram o "Premium + IA" separado e os planos anuais.
//
// O plano pago reaproveita os IDs que já existiam nas lojas (base plan
// `premium-monthly` no Google Play, produto
// `com.jesuscorner.app.premium.monthly` na Apple): trocar o preço de um
// produto existente nas duas lojas mantém quem já assina no preço antigo
// e cobra o novo de quem assina daqui pra frente. O preço novo precisa ser
// configurado À MÃO no Play Console e no App Store Connect — este arquivo
// não muda o que as lojas cobram.
//
// GOOGLE PLAY: um único produto de assinatura `premium`. googlePlayBasePlan
// precisa bater exatamente com o Base plan ID cadastrado no Play Console.
//
// APPLE: appleProductId precisa bater com o Product ID cadastrado no App
// Store Connect. `appleUsd`/`appleBrl` são o preço configurado lá — se a
// tabela de pontos de preço da Apple não tiver o valor exato, troque aqui
// pelo ponto escolhido.
export const PAID_PLAN = {
  tier: 'premium', interval: 'month',
  brl: 27, usd: 7,
  googlePlayBasePlan: 'premium-monthly',
  appleProductId: 'com.jesuscorner.app.premium.monthly',
  appleUsd: 7, appleBrl: 27,
}

export const STORE_TIERS = { premium_monthly: PAID_PLAN }

// Produtos que não se vendem mais, mas que ainda podem RENOVAR para quem
// assinou antes (anual, e o antigo "Premium + IA"). As verificações de
// compra precisam reconhecê-los pra não recusar a renovação de quem já
// paga; nenhuma tela oferece estes produtos. Os valores são os de quando
// foram vendidos — o que essas pessoas continuam pagando.
export const LEGACY_STORE_TIERS = {
  premium_annual: {
    tier: 'premium', interval: 'year',
    brl: 119.90, usd: 34.99,
    googlePlayBasePlan: 'premium-annual',
    appleProductId: 'com.jesuscorner.app.premium.annual',
  },
  premium_ai_monthly: {
    tier: 'premium_ai', interval: 'month',
    brl: 21.90, usd: 7.99,
    googlePlayBasePlan: 'premium-ai-monthly',
    appleProductId: 'com.jesuscorner.app.premium_ai.monthly',
  },
  premium_ai_annual: {
    tier: 'premium_ai', interval: 'year',
    brl: 199.90, usd: 74.99,
    googlePlayBasePlan: 'premium-ai-annual',
    appleProductId: 'com.jesuscorner.app.premium_ai.annual',
  },
}

const ALL_TIERS = { ...STORE_TIERS, ...LEGACY_STORE_TIERS }

// O productId único da assinatura no Google Play (todos os base plans vivem
// dentro dele). Usado na compra via Digital Goods API / PaymentRequest.
export const GOOGLE_PLAY_SUBSCRIPTION_ID = 'premium'

// O preço do plano pago numa moeda ('brl' | 'usd'), em centavos.
export function paidPlanCents(currency) {
  return Math.round(PAID_PLAN[currency === 'brl' ? 'brl' : 'usd'] * 100)
}

// Brasil paga em reais; o resto do mundo, em dólar. Sem país conhecido, o
// idioma decide (português → reais).
export function currencyForCountry(country, lang = 'pt') {
  if (country) return country === 'BR' ? 'brl' : 'usd'
  return lang === 'en' ? 'usd' : 'brl'
}

export function findTierByGooglePlayBasePlan(basePlanId) {
  for (const key of Object.keys(ALL_TIERS)) {
    if (ALL_TIERS[key].googlePlayBasePlan === basePlanId) return { ...ALL_TIERS[key], key }
  }
  return null
}

export function findTierByAppleProductId(productId) {
  for (const key of Object.keys(ALL_TIERS)) {
    if (ALL_TIERS[key].appleProductId === productId) return { ...ALL_TIERS[key], key }
  }
  return null
}
