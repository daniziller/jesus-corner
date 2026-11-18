// Testes da assinatura (pedido dela, 2026-11-18): só duas versões — grátis
// e o Premium, um plano mensal de R$27 no Brasil e US$7 no resto do mundo.
// node scripts/test-assinatura.mjs
import { readFileSync } from 'node:fs'
import { PAID_PLAN, STORE_TIERS, LEGACY_STORE_TIERS, paidPlanCents, currencyForCountry, findTierByAppleProductId, findTierByGooglePlayBasePlan } from '../src/billing/storeTiers.js'
import { FREE_FEATURES, PREMIUM_FEATURES } from '../src/billing/planFeatures.js'
import { STRINGS } from '../src/i18n/translations.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

// ── O preço ─────────────────────────────────────────────────────────────
check('um plano só à venda, mensal', [Object.keys(STORE_TIERS), PAID_PLAN.interval], [['premium_monthly'], 'month'])
check('R$27 no Brasil, US$7 fora', [paidPlanCents('brl'), paidPlanCents('usd')], [2700, 700])
check('moeda desconhecida cai em dólar', paidPlanCents('eur'), 700)
check('Brasil paga em reais; o resto do mundo, em dólar', [currencyForCountry('BR'), currencyForCountry('US'), currencyForCountry('PT'), currencyForCountry('JP', 'pt')], ['brl', 'usd', 'usd', 'usd'])
check('sem país, o idioma decide', [currencyForCountry(null, 'pt'), currencyForCountry(null, 'en'), currencyForCountry('', 'pt')], ['brl', 'usd', 'brl'])

// ── Quem já assinou um plano que não se vende mais ──────────────────────
check('o plano atual é reconhecido nas duas lojas', [findTierByAppleProductId(PAID_PLAN.appleProductId)?.key, findTierByGooglePlayBasePlan(PAID_PLAN.googlePlayBasePlan)?.key], ['premium_monthly', 'premium_monthly'])
check('anual e "Premium + IA" ainda renovam (Apple e Google)', Object.values(LEGACY_STORE_TIERS).map(tr => [!!findTierByAppleProductId(tr.appleProductId), !!findTierByGooglePlayBasePlan(tr.googlePlayBasePlan)]), [[true, true], [true, true], [true, true]])
check('produto desconhecido continua recusado', [findTierByAppleProductId('x'), findTierByGooglePlayBasePlan('x')], [null, null])

// ── Acesso: qualquer assinatura ativa dá tudo ───────────────────────────
const { fetchEntitlement } = await import('../api/_lib/entitlement.js')
const fakeDb = sub => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: sub }) }) }) }) })
const ent = async sub => (({ hasPremium, hasAI }) => [hasPremium, hasAI])(await fetchEntitlement(fakeDb(sub), 'u'))
check('servidor: sem assinatura, nada', await ent(null), [false, false])
check('servidor: o antigo "Premium" (sem IA) agora tem IA', await ent({ status: 'active', access_type: 'recurring', tier: 'premium' }), [true, true])
check('servidor: assinatura nova, tudo', await ent({ status: 'active', access_type: 'recurring', tier: 'premium' }), [true, true])
check('servidor: cancelada, nada', await ent({ status: 'canceled', access_type: 'recurring', tier: 'premium_ai' }), [false, false])
const entCliente = ler('src/billing/entitlement.js')
check('cliente: assinatura ativa dá Premium e IA juntos', /return \{ tier: 'premium', hasPremium: true, hasAI: true \}/.test(entCliente), true)

// ── O checkout do site cobra o preço da tabela, só mensal ───────────────
const checkout = ler('api/create-checkout-session.js')
check('checkout usa paidPlanCents e ignora interval/tier do cliente', [/paidPlanCents\(currency\)/.test(checkout), /const interval = INTERVAL/.test(checkout), /FIXED_PRICES_CENTS/.test(checkout)], [true, true, false])
check('o app manda só a moeda', /authorizedPost\('\/api\/create-checkout-session', \{ currency \}\)/.test(ler('src/billing/subscriptionStore.js')), true)

// ── A tela de assinatura ────────────────────────────────────────────────
const tela = ler('src/screens/UpgradeScreen.jsx')
check('sem escolha de tier nem de anual', /selectedTier|modeAnnual|premium_ai|getStoreTier/.test(tela), false)
check('a tela compara pela mesma lista do onboarding', [/FREE_FEATURES/.test(tela), /PREMIUM_FEATURES/.test(tela)], [true, true])

// ── A lista do que cada versão entrega ──────────────────────────────────
const todas = [...FREE_FEATURES, ...PREMIUM_FEATURES]
check('nenhum recurso nas duas listas', todas.length, new Set(todas).size)
check('todo recurso tem texto em pt e en', todas.filter(k => !STRINGS.pt.billing.features[k] || !STRINGS.en.billing.features[k]), [])
check('as mesmas chaves de assinatura nos dois idiomas', Object.keys(STRINGS.pt.billing).sort(), Object.keys(STRINGS.en.billing).sort())
check('nenhum texto do app fala em "Premium + IA"', JSON.stringify(STRINGS).match(/Premium \+ (IA|AI)/g), null)

// ── O onboarding diz o que é grátis e o que é Premium ───────────────────
const fluxo = ler('src/screens/OnboardingFlow.jsx')
check('"Grátis e Premium" vem logo antes do resultado', /'chooseStart', 'plans', 'result'\]/.test(fluxo), true)
check('o passo novo é contado no funil do admin', /'chooseStart', 'plans', 'result'/.test(ler('api/track-onboarding-event.js')), true)
const planos = ler('src/screens/OnboardingPlans.jsx')
check('a tela do onboarding usa a mesma lista e o mesmo preço da assinatura', [/FREE_FEATURES/.test(planos), /PREMIUM_FEATURES/.test(planos), /paidPlanCents\(currency\)/.test(planos), /currencyForCountry/.test(planos)], [true, true, true, true])
check('as demonstrações de recurso pago dizem "No Premium"', /const premium = kind === 'ask' \|\| kind === 'group'/.test(ler('src/screens/OnboardingDemo.jsx')), true)
check('a ordem cronológica aparece marcada como Premium para quem não assina', /!session\.hasPremium && <span style=\{s\.premiumTag\}>/.test(ler('src/screens/ChooseStartScreen.jsx')), true)
check('a demonstração não promete versões que o app não tem', [/Cinco versões|Five Bible versions/.test(JSON.stringify(STRINGS)), STRINGS.pt.onb.demoReadingBody.includes('NVT'), STRINGS.en.onb.demoReadingBody.includes('NLT')], [false, true, true])
check('o resultado não diz que "Perguntar sobre o texto" vem ligado', [STRINGS.pt.onb.resultAiSuffix.includes('Premium'), STRINGS.en.onb.resultAiSuffix.includes('Premium')], [true, true])
check('boas-vindas: o que é grátis e o que é Premium', [STRINGS.pt.welcome.promise1.includes('grátis'), STRINGS.pt.welcome.promise3.includes('Premium'), STRINGS.en.welcome.promise1.includes('free'), STRINGS.en.welcome.promise3.includes('Premium')], [true, true, true, true])
check('textos novos do onboarding nos dois idiomas', ['plansKicker', 'plansTitle', 'plansSub', 'plansFreeLabel', 'plansFreePrice', 'plansPremiumLead', 'plansNote', 'plansBtn', 'demoPremium', 'resultGuided'].filter(k => !STRINGS.pt.onb[k] || !STRINGS.en.onb[k]), [])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da assinatura passaram.')
