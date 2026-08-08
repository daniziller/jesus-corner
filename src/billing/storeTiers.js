// Única fonte de verdade dos preços fixos vendidos nas lojas (Google Play
// Billing / Apple StoreKit) — os mesmos preços fixos cobrados via
// Stripe/web (ver FIXED_PRICES_CENTS em api/create-checkout-session.js e
// UpgradeScreen.jsx): R$16,90/mês · R$169,90/ano · US$6,90/mês ·
// US$69,90/ano. Um único plano por intervalo (não mais uma lista de
// valores à escolha) — cada um com seu preço por moeda.
//
// googlePlaySku precisa bater exatamente com o ID do base plan cadastrado
// no Play Console (Monetize → Products → Subscriptions). appleProductId
// precisa bater com o Product ID cadastrado no App Store Connect.
export const STORE_TIERS = {
  monthly: { brl: 16.90, usd: 6.90, googlePlaySku: 'monthly', appleProductId: 'com.jesuscorner.app.monthly' },
  annual:  { brl: 169.90, usd: 69.90, googlePlaySku: 'annual', appleProductId: 'com.jesuscorner.app.annual' },
}

export function findTierByGooglePlaySku(sku) {
  for (const mode of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[mode].googlePlaySku === sku) return { ...STORE_TIERS[mode], mode }
  }
  return null
}

export function findTierByAppleProductId(productId) {
  for (const mode of Object.keys(STORE_TIERS)) {
    if (STORE_TIERS[mode].appleProductId === productId) return { ...STORE_TIERS[mode], mode }
  }
  return null
}
