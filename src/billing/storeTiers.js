// Única fonte de verdade dos preços fixos vendidos nas lojas (Google Play
// Billing / Apple StoreKit) — os mesmos preços fixos cobrados via
// Stripe/web (ver FIXED_PRICES_CENTS em api/create-checkout-session.js).
// `usd`/`brl` aqui alimentam o `amount_cents` gravado em `subscriptions`
// nas duas verificações de compra (verify-apple-purchase.js,
// verify-google-play-purchase.js) — usado no MRR do admin — então
// precisam bater com o preço REAL configurado em cada loja, não só com o
// que foi sugerido quando o produto ainda não existia lá.
//
// Dois tiers × dois intervalos = 4 produtos (preço "oficial", Play/Stripe):
//   Premium        — R$12,90/mês · R$119,90/ano · US$3,99/mês · US$34,99/ano
//   Premium + IA   — R$21,90/mês · R$199,90/ano · US$7,99/mês · US$74,99/ano
// Apple tem sua própria tabela de pontos de preço, sem equivalente exato
// pra todo valor acima — o mensal da Apple (2026-10-03) ficou em
// US$4,99/R$19,90 em vez de US$3,99/R$12,90 (ver appleUsd/appleBrl no
// premium_monthly abaixo); os demais produtos Apple ainda não foram
// criados no App Store Connect.
//
// GOOGLE PLAY: um único produto de assinatura `premium` com 4 base plans.
// googlePlayBasePlan precisa bater exatamente com o Base plan ID cadastrado
// no Play Console (Monetize → Products → Subscriptions → premium). Manter
// tudo dentro de UMA assinatura evita o fluxo de "cross-group upgrade"
// (linkedPurchaseToken) ao trocar Premium ↔ Premium + IA.
//
// APPLE: appleProductId precisa bater com o Product ID cadastrado no App
// Store Connect (um Subscription Group, 4 produtos).
export const STORE_TIERS = {
  premium_monthly: {
    tier: 'premium', interval: 'month',
    brl: 12.90, usd: 3.99,
    googlePlayBasePlan: 'premium-monthly',
    appleProductId: 'com.jesuscorner.app.premium.monthly',
    // Preço de verdade configurado no App Store Connect (2026-10-03) — a
    // Apple não ofereceu US$3,99 como ponto de preço nessa faixa; usado
    // só por verify-apple-purchase.js (currency === 'usd'/'brl' vindo da
    // Apple), nunca pela Play Billing nem pelo checkout Stripe/web, que
    // continuam em `usd`/`brl` acima.
    appleUsd: 4.99, appleBrl: 19.90,
  },
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

// O productId único da assinatura no Google Play (todos os base plans vivem
// dentro dele). Usado na compra via Digital Goods API / PaymentRequest.
export const GOOGLE_PLAY_SUBSCRIPTION_ID = 'premium'

export function tierKeyFor(tier, interval) {
  const annual = interval === 'year' || interval === 'annual'
  if (tier === 'premium_ai') return annual ? 'premium_ai_annual' : 'premium_ai_monthly'
  return annual ? 'premium_annual' : 'premium_monthly'
}

export function getStoreTier(tier, interval) {
  return STORE_TIERS[tierKeyFor(tier, interval)]
}

export function findTierByGooglePlayBasePlan(basePlanId) {
  for (const key of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[key].googlePlayBasePlan === basePlanId) return { ...STORE_TIERS[key], key }
  }
  return null
}

export function findTierByAppleProductId(productId) {
  for (const key of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[key].appleProductId === productId) return { ...STORE_TIERS[key], key }
  }
  return null
}
