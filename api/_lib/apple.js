// Cliente compartilhado da App Store Server API — usado tanto por
// api/verify-apple-purchase.js (confirmar uma compra na hora) quanto por
// api/apple-server-notifications.js (re-checar o estado real quando chega
// uma notificação de mudança). Usa a biblioteca oficial da Apple
// (@apple/app-store-server-library) em vez de assinar JWT/verificar JWS na
// mão — verificação de cadeia de certificado é fácil de errar escrevendo
// do zero.
//
// FLAG: esta integração nunca foi compilada nem testada (sem Xcode nesta
// máquina pra sequer ter um app iOS de teste) — os nomes exatos de
// classes/métodos abaixo (AppStoreServerAPIClient, SignedDataVerifier,
// Environment, getAllSubscriptionStatuses) são reconstruídos de memória,
// não de uma leitura fresca da documentação. CONFERIR contra a
// documentação atual da @apple/app-store-server-library antes de confiar.
import {
  AppStoreServerAPIClient, SignedDataVerifier, Environment,
} from '@apple/app-store-server-library'

export const BUNDLE_ID = 'com.jesuscorner.app'

let _apiClient = null
function getApiClient() {
  if (!_apiClient) {
    _apiClient = new AppStoreServerAPIClient(
      process.env.APPLE_PRIVATE_KEY,
      process.env.APPLE_KEY_ID,
      process.env.APPLE_ISSUER_ID,
      BUNDLE_ID,
      Environment.PRODUCTION,
    )
  }
  return _apiClient
}

let _verifier = null
function getVerifier() {
  if (!_verifier) {
    // rootCertificates: a biblioteca oficial inclui os certificados raiz da
    // Apple pra validação de cadeia — CONFERIR se a versão instalada ainda
    // exige passar isso manualmente ou já embute por padrão.
    _verifier = new SignedDataVerifier([], true, Environment.PRODUCTION, BUNDLE_ID)
  }
  return _verifier
}

// Sempre busca o estado direto na fonte (nunca confia no conteúdo de uma
// notificação de webhook, nem no JWS que o cliente manda, sozinhos) — mesma
// filosofia do stripe-webhook.js e de _lib/googlePlay.js.
export async function getSubscriptionStatuses(originalTransactionId) {
  const client = getApiClient()
  const response = await client.getAllSubscriptionStatuses(originalTransactionId)
  return response
}

export async function decodeSignedTransaction(signedTransactionInfo) {
  const verifier = getVerifier()
  return verifier.verifyAndDecodeTransaction(signedTransactionInfo)
}

export async function decodeSignedNotification(signedPayload) {
  const verifier = getVerifier()
  return verifier.verifyAndDecodeNotification(signedPayload)
}

// Traduz o status numérico da App Store Server API pro vocabulário que o
// resto do app já usa (o mesmo que o Stripe/Play gravam) — CONFERIR contra
// a documentação atual antes de confiar cegamente neste mapeamento.
// 1=ACTIVE 2=EXPIRED 3=IN_BILLING_RETRY_PERIOD 4=IN_GRACE_PERIOD 5=REVOKED
const STATE_MAP = {
  1: 'active',
  2: 'canceled',
  3: 'past_due',
  4: 'past_due',
  5: 'canceled',
}

export function mapAppleSubscriptionState(status) {
  return STATE_MAP[status] ?? 'incomplete'
}
