// Cliente compartilhado da Google Play Developer API (Android Publisher v3)
// — usado tanto por api/verify-google-play-purchase.js (confirmar uma
// compra na hora) quanto por api/google-play-rtdn.js (re-checar o estado
// real quando chega uma notificação de mudança). Autenticado via service
// account (ver checklist do plano — Google Cloud → IAM → Service Accounts),
// nunca com a conta pessoal de ninguém.
import { google } from 'googleapis'

export const PACKAGE_NAME = 'com.jesuscorner.app'

let _authClient = null
function getAuthClient() {
  if (!_authClient) {
    const credentials = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
    _authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    })
  }
  return _authClient
}

function getPublisher() {
  return google.androidpublisher({ version: 'v3', auth: getAuthClient() })
}

// Sempre busca o estado direto na fonte (nunca confia no conteúdo de uma
// notificação de webhook sozinho) — mesma filosofia do stripe-webhook.js,
// que sempre re-busca via stripe.subscriptions.retrieve.
export async function getSubscriptionPurchase(purchaseToken) {
  const publisher = getPublisher()
  const { data } = await publisher.purchases.subscriptionsv2.get({
    packageName: PACKAGE_NAME,
    token: purchaseToken,
  })
  return data
}

// Traduz o subscriptionState da Play Developer API v3 (subscriptionsv2)
// pro vocabulário de status que o resto do app já usa (o mesmo que o
// Stripe grava, ver supabase/migrations/0016_subscriptions.sql) — CONFERIR
// contra a documentação atual da Android Publisher API antes de confiar
// cegamente neste mapeamento, esse enum já mudou entre versões da API.
const STATE_MAP = {
  SUBSCRIPTION_STATE_ACTIVE: 'active',
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'past_due',
  SUBSCRIPTION_STATE_ON_HOLD: 'unpaid',
  SUBSCRIPTION_STATE_CANCELED: 'canceled',
  SUBSCRIPTION_STATE_EXPIRED: 'canceled',
  SUBSCRIPTION_STATE_PAUSED: 'past_due',
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'incomplete_expired',
}

export function mapPlaySubscriptionState(subscriptionState) {
  return STATE_MAP[subscriptionState] ?? 'incomplete'
}
