// Única fonte de verdade dos preços fixos vendidos nas lojas (Google Play
// Billing / Apple StoreKit) — diferente do Stripe/web, que continua com
// valor 100% livre (ver UpgradeScreen.jsx e PRESETS lá). Nenhuma conversão
// de moeda: os mesmos números valem em BRL e USD, mesmo padrão já usado
// nos presets do Stripe.
//
// googlePlaySku precisa bater exatamente com o ID do base plan cadastrado
// no Play Console (Monetize → Products → Subscriptions). appleProductId
// precisa bater com o Product ID cadastrado no App Store Connect. Nenhum
// valor de 0 aparece aqui — a contribuição grátis nunca passa por loja
// nenhuma (ver activateFreeAccess em subscriptionStore.js).
export const STORE_TIERS = {
  monthly: [
    { value: 10, googlePlaySku: 'monthly-10', appleProductId: 'com.jesuscorner.app.monthly.10' },
    { value: 20, googlePlaySku: 'monthly-20', appleProductId: 'com.jesuscorner.app.monthly.20' },
    { value: 30, googlePlaySku: 'monthly-30', appleProductId: 'com.jesuscorner.app.monthly.30' },
    { value: 40, googlePlaySku: 'monthly-40', appleProductId: 'com.jesuscorner.app.monthly.40' },
    { value: 50, googlePlaySku: 'monthly-50', appleProductId: 'com.jesuscorner.app.monthly.50' },
  ],
  annual: [
    { value: 100, googlePlaySku: 'annual-100', appleProductId: 'com.jesuscorner.app.annual.100' },
    { value: 150, googlePlaySku: 'annual-150', appleProductId: 'com.jesuscorner.app.annual.150' },
    { value: 200, googlePlaySku: 'annual-200', appleProductId: 'com.jesuscorner.app.annual.200' },
    { value: 250, googlePlaySku: 'annual-250', appleProductId: 'com.jesuscorner.app.annual.250' },
    { value: 300, googlePlaySku: 'annual-300', appleProductId: 'com.jesuscorner.app.annual.300' },
    { value: 350, googlePlaySku: 'annual-350', appleProductId: 'com.jesuscorner.app.annual.350' },
  ],
}

export function findTierByGooglePlaySku(sku) {
  for (const mode of Object.keys(STORE_TIERS)) {
    const tier = STORE_TIERS[mode].find(t => t.googlePlaySku === sku)
    if (tier) return { ...tier, mode }
  }
  return null
}

export function findTierByAppleProductId(productId) {
  for (const mode of Object.keys(STORE_TIERS)) {
    const tier = STORE_TIERS[mode].find(t => t.appleProductId === productId)
    if (tier) return { ...tier, mode }
  }
  return null
}
