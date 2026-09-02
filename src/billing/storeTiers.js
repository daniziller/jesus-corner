// Única fonte de verdade dos preços fixos vendidos nas lojas (Google Play
// Billing / Apple StoreKit) — os mesmos preços fixos cobrados via
// Stripe/web (ver FIXED_PRICES_CENTS em api/create-checkout-session.js).
//
// Dois tiers × dois intervalos = 4 produtos:
//   Premium        — R$12,90/mês · R$119,90/ano · US$3,99/mês · US$34,99/ano
//   Premium + IA   — R$21,90/mês · R$199,90/ano · US$7,99/mês · US$74,99/ano
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
