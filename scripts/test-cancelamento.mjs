// Assinatura cancelada que vale até o fim do período (pedido dela,
// 2026-11-19): o app sabe do cancelamento (Stripe, Google Play, Apple),
// mostra "Cancelada · Premium até [data]" com o botão de reativar, e a
// conta vira gratuita na data — nem antes (o Play cortava na hora), nem
// depois (se o aviso de expiração atrasar).
// node scripts/test-cancelamento.mjs
import { readFileSync } from 'node:fs'
import { isActive } from '../api/_lib/entitlement.js'
import { playSubscriptionState } from '../api/_lib/googlePlay.js'

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'OK ' : 'FALHOU'} ${label}${ok ? '' : `\n    esperado: ${JSON.stringify(expected)}\n    recebido: ${JSON.stringify(actual)}`}`)
}
const ler = caminho => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8')

const agora = Date.UTC(2026, 10, 19, 12)
const futuro = new Date(agora + 10 * 86400000).toISOString()
const passado = new Date(agora - 86400000).toISOString()

// ── Google Play ─────────────────────────────────────────────────────────
const play = (state, expiryTime, autoRenewEnabled) => ({ subscriptionState: state, lineItems: [{ expiryTime, autoRenewingPlan: autoRenewEnabled === undefined ? undefined : { autoRenewEnabled } }] })
check('Play CANCELED com período pago: continua ativo, cancelado no fim', playSubscriptionState(play('SUBSCRIPTION_STATE_CANCELED', futuro), agora), { status: 'active', cancelAtPeriodEnd: true })
check('Play CANCELED já vencido: cancelado', playSubscriptionState(play('SUBSCRIPTION_STATE_CANCELED', passado), agora), { status: 'canceled', cancelAtPeriodEnd: false })
check('Play ACTIVE com renovação desligada: cancelado no fim', playSubscriptionState(play('SUBSCRIPTION_STATE_ACTIVE', futuro, false), agora), { status: 'active', cancelAtPeriodEnd: true })
check('Play ACTIVE renovando: normal', playSubscriptionState(play('SUBSCRIPTION_STATE_ACTIVE', futuro, true), agora), { status: 'active', cancelAtPeriodEnd: false })
check('Play EXPIRED: cancelado', playSubscriptionState(play('SUBSCRIPTION_STATE_EXPIRED', passado), agora), { status: 'canceled', cancelAtPeriodEnd: false })

// ── Quem tem o Premium ──────────────────────────────────────────────────
const sub = extra => ({ access_type: 'recurring', status: 'active', ...extra })
check('cancelada com data futura: Premium continua', isActive(sub({ cancel_at_period_end: true, current_period_end: futuro }), agora), true)
check('cancelada e a data passou: conta gratuita, mesmo sem o aviso do provedor', isActive(sub({ cancel_at_period_end: true, current_period_end: passado }), agora), false)
check('renovando com data passada (renovação a caminho): não corta', isActive(sub({ cancel_at_period_end: false, current_period_end: passado }), agora), true)
check('vitalício e cortesia não mudam', [isActive({ access_type: 'lifetime', status: 'active', cancel_at_period_end: true, current_period_end: passado }, agora), isActive({ access_type: 'free', status: 'active' }, agora)], [true, true])
check('servidor lê os campos novos', /select\('status, access_type, tier, cancel_at_period_end, current_period_end'\)/.test(ler('api/_lib/entitlement.js')), true)
const cliente = ler('src/billing/subscriptionStore.js')
check('app: mesma regra da data', /isCancelScheduled\(subscription\) && subscription\.current_period_end && Date\.parse\(subscription\.current_period_end\) <= nowMs\) return false/.test(cliente), true)
const digest = ler('api/send-weekly-digest.js')
check('resumo semanal: confere Premium com os campos novos', [/'user_id, status, access_type, cancel_at_period_end, current_period_end'/.test(digest), /filter\(r => isActive\(r\)\)/.test(digest)], [true, true])

// ── Os três provedores gravam o cancelamento ────────────────────────────
check('Stripe: cancel_at_period_end ou cancel_at', /p_cancel_at_period_end: !!\(subscription\.cancel_at_period_end \|\| subscription\.cancel_at\)/.test(ler('api/stripe-webhook.js')), true)
check('Play: aviso e compra gravam o cancelamento', ['api/google-play-rtdn.js', 'api/verify-google-play-purchase.js'].map(f => /cancel_at_period_end: cancelAtPeriodEnd/.test(ler(f))), [true, true])
check('Apple: aviso e compra gravam o cancelamento (renovação desligada)', ['api/apple-server-notifications.js', 'api/verify-apple-purchase.js'].map(f => /cancel_at_period_end: cancelAtPeriodEnd/.test(ler(f))), [true, true])
check('Apple: lê autoRenewStatus da renewal info', /info\?\.autoRenewStatus === 0/.test(ler('api/_lib/apple.js')), true)
const mig = ler('supabase/migrations/0088_cancelamento_no_fim_do_periodo.sql')
check('migração: coluna e função do Stripe com o campo', [/add column if not exists cancel_at_period_end boolean not null default false/.test(mig), /cancel_at_period_end = excluded\.cancel_at_period_end/.test(mig)], [true, true])

// ── A tela ──────────────────────────────────────────────────────────────
const tela = ler('src/screens/UpgradeScreen.jsx')
check('tela de assinatura: cartão de cancelada com data e reativar', [/t\('billing\.premiumUntil', \{ date: premiumUntil \}/.test(tela), /t\('billing\.reactivateBtn'/.test(tela)], [true, true])
check('antes de cancelar: explica o que acontece, por provedor', /t\(`billing\.cancelHow\.\$\{billedBy\}`/.test(tela), true)
check('Perfil: "Cancelada · Premium até"', /billing\.subscriptionCanceledSub/.test(ler('src/screens/ProfileScreen.jsx')), true)

if (failures) { console.log(`\n${failures} teste(s) falharam.`); process.exit(1) }
console.log('\nTodos os testes de cancelamento passaram.')
