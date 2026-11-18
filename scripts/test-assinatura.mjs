// Testes da assinatura (pedido dela, 2026-11-18): só duas versões — grátis
// e o Premium, por mês (R$27 no Brasil, US$7 fora) ou por ano (R$267 /
// US$57).
// node scripts/test-assinatura.mjs
import { readFileSync } from 'node:fs'
import { PAID_PLANS, STORE_TIERS, LEGACY_STORE_TIERS, paidPlanCents, annualFreeMonths, normalizeInterval, currencyForCountry, findTierByAppleProductId, findTierByGooglePlayBasePlan } from '../src/billing/storeTiers.js'
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
check('à venda: o Premium mensal e o anual, um tier só', [Object.keys(STORE_TIERS), Object.values(STORE_TIERS).map(p => [p.tier, p.interval])], [['premium_monthly', 'premium_annual'], [['premium', 'month'], ['premium', 'year']]])
check('mensal: R$27 no Brasil, US$7 fora', [paidPlanCents('brl'), paidPlanCents('usd'), paidPlanCents('brl', 'month')], [2700, 700, 2700])
check('anual: R$267 no Brasil, US$57 fora', [paidPlanCents('brl', 'year'), paidPlanCents('usd', 'year'), paidPlanCents('brl', 'annual')], [26700, 5700, 26700])
check('intervalo inválido vira mensal', [normalizeInterval('week'), normalizeInterval(undefined), normalizeInterval('year')], ['month', 'month', 'year'])
check('selo do anual nunca promete mais do que a conta: 2 meses (R$) e 3 meses (US$, 3,86)', [annualFreeMonths('brl'), annualFreeMonths('usd')], [2, 3])
check('o anual reaproveita os IDs anuais que já existiam nas lojas', [PAID_PLANS.year.googlePlayBasePlan, PAID_PLANS.year.appleProductId], ['premium-annual', 'com.jesuscorner.app.premium.annual'])
check('moeda desconhecida cai em dólar', paidPlanCents('eur'), 700)
check('Brasil paga em reais; o resto do mundo, em dólar', [currencyForCountry('BR'), currencyForCountry('US'), currencyForCountry('PT'), currencyForCountry('JP', 'pt')], ['brl', 'usd', 'usd', 'usd'])
check('sem país, o idioma decide', [currencyForCountry(null, 'pt'), currencyForCountry(null, 'en'), currencyForCountry('', 'pt')], ['brl', 'usd', 'brl'])

// ── Quem já assinou um plano que não se vende mais ──────────────────────
check('mensal e anual são reconhecidos nas duas lojas', Object.values(PAID_PLANS).map(p => [findTierByAppleProductId(p.appleProductId)?.key, findTierByGooglePlayBasePlan(p.googlePlayBasePlan)?.key]), [['premium_monthly', 'premium_monthly'], ['premium_annual', 'premium_annual']])
check('o antigo "Premium + IA" ainda renova (Apple e Google)', Object.values(LEGACY_STORE_TIERS).map(tr => [!!findTierByAppleProductId(tr.appleProductId), !!findTierByGooglePlayBasePlan(tr.googlePlayBasePlan)]), [[true, true], [true, true]])
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
check('checkout cobra da tabela, por moeda e intervalo, e ignora o tier do cliente', [/paidPlanCents\(currency, interval\)/.test(checkout), /const interval = normalizeInterval\(requestedInterval\)/.test(checkout), /const tier = TIER/.test(checkout), /FIXED_PRICES_CENTS/.test(checkout)], [true, true, true, false])
check('o app manda moeda e intervalo', /authorizedPost\('\/api\/create-checkout-session', \{ currency, interval \}\)/.test(ler('src/billing/subscriptionStore.js')), true)

// ── A tela de assinatura ────────────────────────────────────────────────
const tela = ler('src/screens/UpgradeScreen.jsx')
check('um tier só, com escolha de mensal ou anual', [/selectedTier|premium_ai|getStoreTier/.test(tela), /\['month', 'year'\]\.map/.test(tela), /startCheckout\(\{ currency, interval \}\)/.test(tela)], [false, true, true])
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
check('a tela do onboarding usa a mesma lista e o mesmo preço da assinatura', [/FREE_FEATURES/.test(planos), /PREMIUM_FEATURES/.test(planos), /paidPlanCents\(currency, 'year'\)/.test(planos), /currencyForCountry/.test(planos)], [true, true, true, true])
check('as demonstrações de recurso pago dizem "No Premium"', /const premium = kind === 'ask' \|\| kind === 'group'/.test(ler('src/screens/OnboardingDemo.jsx')), true)
check('a ordem cronológica aparece marcada como Premium para quem não assina', /!session\.hasPremium && <span style=\{s\.premiumTag\}>/.test(ler('src/screens/ChooseStartScreen.jsx')), true)
check('a demonstração não promete versões que o app não tem', [/Cinco versões|Five Bible versions/.test(JSON.stringify(STRINGS)), STRINGS.pt.onb.demoReadingBody.includes('NVT'), STRINGS.en.onb.demoReadingBody.includes('NLT')], [false, true, true])
check('o resultado não diz que "Perguntar sobre o texto" vem ligado', [STRINGS.pt.onb.resultAiSuffix.includes('Premium'), STRINGS.en.onb.resultAiSuffix.includes('Premium')], [true, true])
check('boas-vindas: o que é grátis e o que é Premium', [STRINGS.pt.welcome.promise1.includes('grátis'), STRINGS.pt.welcome.promise3.includes('Premium'), STRINGS.en.welcome.promise1.includes('free'), STRINGS.en.welcome.promise3.includes('Premium')], [true, true, true, true])
check('textos novos do onboarding nos dois idiomas', ['plansKicker', 'plansTitle', 'plansSub', 'plansFreeLabel', 'plansFreePrice', 'plansPremiumLead', 'plansNote', 'plansBtn', 'demoPremium', 'resultGuided'].filter(k => !STRINGS.pt.onb[k] || !STRINGS.en.onb[k]), [])

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes da assinatura passaram.')
