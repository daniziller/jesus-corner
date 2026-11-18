// planFeatures.js — o que a versão grátis e o plano Premium entregam, numa
// lista só, usada na tela de assinatura (UpgradeScreen.jsx) e no
// onboarding (OnboardingPlans.jsx), pra as duas nunca prometerem coisas
// diferentes. Os textos ficam em billing.features.* (translations.js).
//
// Pedido dela (2026-11-18): só duas versões — grátis, com recursos
// limitados, e o Premium (R$27/mês no Brasil, US$7/mês no resto do mundo),
// com tudo. A lista espelha as travas de verdade do app: `hasPremium`
// (App.jsx, lockedTabs e telas) e `hasAI` (que agora vem junto com o
// Premium — ver billing/entitlement.js).

// Grátis, para sempre. A oração não está aqui de propósito: hoje ela só
// abre de dentro do plano diário guiado (Meu Plano e o cartão do plano no
// Hoje), que é Premium — a reflexão livre, sim, abre depois de cada
// leitura para qualquer conta.
export const FREE_FEATURES = ['read', 'listen', 'reflection', 'verse', 'progress']

// Premium: tudo do grátis e mais isto.
export const PREMIUM_FEATURES = ['guided', 'ask', 'reflectionQs', 'studies', 'library', 'community', 'voice', 'chrono']
