// Cliente compartilhado da App Store Server API — usado tanto por
// api/verify-apple-purchase.js (confirmar uma compra na hora) quanto por
// api/apple-server-notifications.js (re-checar o estado real quando chega
// uma notificação de mudança). Usa a biblioteca oficial da Apple
// (@apple/app-store-server-library) em vez de assinar JWT/verificar JWS na
// mão — verificação de cadeia de certificado é fácil de errar escrevendo
// do zero.
//
// Varredura 2026-10-25 — a versão anterior não tinha como funcionar, por
// três motivos independentes, conferidos no código da lib (3.1.0):
//   1. `new SignedDataVerifier([], true, PRODUCTION, BUNDLE_ID)` sem o
//      appAppleId LANÇA no construtor em Production ("appAppleId is
//      required when the environment is Production") — toda compra iOS
//      caía em `verification_failed`, e toda notificação da App Store era
//      descartada com 200 (sem retry).
//   2. rootCertificates vazio: verifyCertificateChainWithoutCaching itera
//      as raízes confiáveis pra validar a cadeia x5c; sem nenhuma, nada
//      valida (VERIFICATION_FAILURE). A lib NÃO embute as raízes da Apple
//      — precisam vir de fora (ver getRootCertificates).
//   3. Tudo preso em Production: compras de Sandbox/TestFlight/revisão da
//      Apple vêm com environment "Sandbox" e falhavam em
//      INVALID_ENVIRONMENT; a API de status também tem URL própria por
//      ambiente. Agora o ambiente é lido do próprio JWS e tudo (verifier,
//      cliente da API) é escolhido por ele, com fallback Production →
//      Sandbox na consulta de status (recomendação da própria Apple).
//
// Variáveis de ambiente:
//   APPLE_PRIVATE_KEY   — chave .p8 da App Store Connect (PEM; "\n" literal
//                         é normalizado)
//   APPLE_KEY_ID, APPLE_ISSUER_ID — da mesma chave
//   APPLE_APP_APPLE_ID  — "Apple ID" numérico do app (App Store Connect →
//                         App Information → General Information). Só é
//                         exigido pra verificar JWS de Production.
//   APPLE_ROOT_CERTS_BASE64 — certificados raiz da Apple em DER, base64,
//                         separados por vírgula (baixar em
//                         https://www.apple.com/certificateauthority/ —
//                         Apple Root CA - G3 é o que assina a App Store;
//                         G2 e o "Apple Inc. Root" podem ir junto). Como
//                         alternativa, o arquivo api/_lib/apple-roots/
//                         AppleRootCA-G3.cer versionado no repo também é
//                         lido, se existir.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AppStoreServerAPIClient, SignedDataVerifier, Environment, APIError,
} from '@apple/app-store-server-library'

export const BUNDLE_ID = 'com.jesuscorner.app'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function normalizeEnvironment(value) {
  return String(value ?? '').toLowerCase() === 'sandbox' ? Environment.SANDBOX : Environment.PRODUCTION
}

// Lê o payload de um JWS SEM verificar — só pra descobrir o ambiente
// (Sandbox/Production) e escolher verifier/cliente certos. A verificação
// de verdade vem logo depois, no SignedDataVerifier daquele ambiente.
function unverifiedPayload(jws) {
  try {
    const part = String(jws).split('.')[1]
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export function environmentOfSignedTransaction(jws) {
  return normalizeEnvironment(unverifiedPayload(jws)?.environment)
}

export function environmentOfSignedNotification(signedPayload) {
  return normalizeEnvironment(unverifiedPayload(signedPayload)?.data?.environment)
}

let _rootCerts = null
function getRootCertificates() {
  if (_rootCerts) return _rootCerts
  const certs = []
  const fromEnv = (process.env.APPLE_ROOT_CERTS_BASE64 ?? '').split(',').map(s => s.trim()).filter(Boolean)
  for (const b64 of fromEnv) certs.push(Buffer.from(b64, 'base64'))
  // Caminho literal (não readdir) de propósito — é o que o empacotador da
  // Vercel consegue rastrear e incluir na função.
  // Dois lugares aceitos: direto em api/_lib/ (dá pra subir pelo site do
  // GitHub sem criar pasta) ou em api/_lib/apple-roots/.
  for (const rel of [['AppleRootCA-G3.cer'], ['apple-roots', 'AppleRootCA-G3.cer']]) {
    try {
      certs.push(fs.readFileSync(path.join(__dirname, ...rel)))
      break
    } catch { /* tenta o próximo */ }
  }
  if (certs.length === 0) {
    throw new Error('apple_root_certs_missing: defina APPLE_ROOT_CERTS_BASE64 (ver api/_lib/apple.js)')
  }
  _rootCerts = certs
  return certs
}

function privateKey() {
  return (process.env.APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
}

const _apiClients = {}
function getApiClient(environment) {
  if (!_apiClients[environment]) {
    _apiClients[environment] = new AppStoreServerAPIClient(
      privateKey(),
      process.env.APPLE_KEY_ID,
      process.env.APPLE_ISSUER_ID,
      BUNDLE_ID,
      environment,
    )
  }
  return _apiClients[environment]
}

const _verifiers = {}
function getVerifier(environment) {
  if (!_verifiers[environment]) {
    let appAppleId
    if (environment === Environment.PRODUCTION) {
      appAppleId = Number(process.env.APPLE_APP_APPLE_ID)
      if (!Number.isFinite(appAppleId) || appAppleId <= 0) {
        throw new Error('apple_app_apple_id_missing: defina APPLE_APP_APPLE_ID (ver api/_lib/apple.js)')
      }
    }
    _verifiers[environment] = new SignedDataVerifier(getRootCertificates(), true, environment, BUNDLE_ID, appAppleId)
  }
  return _verifiers[environment]
}

// Sempre busca o estado direto na fonte (nunca confia no conteúdo de uma
// notificação de webhook, nem no JWS que o cliente manda, sozinhos) — mesma
// filosofia do stripe-webhook.js e de _lib/googlePlay.js. Tenta primeiro no
// ambiente informado; se Production responder "transação não encontrada"
// (4040010), tenta Sandbox — é assim que a Apple manda tratar compras de
// teste chegando num servidor de produção.
export async function getSubscriptionStatuses(originalTransactionId, environment = Environment.PRODUCTION) {
  try {
    return await getApiClient(environment).getAllSubscriptionStatuses(originalTransactionId)
  } catch (err) {
    const notFound = err?.apiError === APIError.TRANSACTION_ID_NOT_FOUND || err?.apiError === 4040010
    if (environment === Environment.PRODUCTION && notFound) {
      return getApiClient(Environment.SANDBOX).getAllSubscriptionStatuses(originalTransactionId)
    }
    throw err
  }
}

// O status relevante dentro de StatusResponse: a resposta é agrupada por
// subscription group, cada um com `lastTransactions[]` — procura o item da
// PRÓPRIA originalTransactionId em todos os grupos (antes pegava o
// [0][0] cego). Cai no primeiro item se não achar.
export function findSubscriptionStatus(statusResponse, originalTransactionId) {
  const groups = statusResponse?.data ?? []
  for (const g of groups) {
    const hit = (g.lastTransactions ?? []).find(t => t.originalTransactionId === originalTransactionId)
    if (hit) return hit.status
  }
  return groups[0]?.lastTransactions?.[0]?.status
}

export async function decodeSignedTransaction(signedTransactionInfo) {
  const verifier = getVerifier(environmentOfSignedTransaction(signedTransactionInfo))
  return verifier.verifyAndDecodeTransaction(signedTransactionInfo)
}

export async function decodeSignedNotification(signedPayload) {
  const verifier = getVerifier(environmentOfSignedNotification(signedPayload))
  return verifier.verifyAndDecodeNotification(signedPayload)
}

// Traduz o status numérico da App Store Server API pro vocabulário que o
// resto do app já usa (o mesmo que o Stripe/Play gravam). Conferido contra
// o enum Status da lib: 1=ACTIVE 2=EXPIRED 3=BILLING_RETRY
// 4=BILLING_GRACE_PERIOD 5=REVOKED.
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

export { Environment }
