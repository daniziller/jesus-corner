// Consentimento em camadas — uma finalidade por vez, como manda o art. 8º,
// §4º da LGPD (consentimento para finalidades genéricas é nulo).
//
// Por que o app precisa disso e não basta o "aceito os termos": num app de
// leitura bíblica, a existência da conta já revela convicção religiosa, que
// o art. 5º, II classifica como dado sensível. Para dado sensível o art. 11
// não oferece legítimo interesse — sobra consentimento específico e
// destacado, por finalidade.
import { supabase } from '../lib/supabaseClient'

import { POLICY_VERSION } from './policyVersion.js'
export { POLICY_VERSION }

export const PURPOSES = {
  // Obrigatórios: sem eles não há como operar o serviço contratado.
  TERMS: 'terms',
  SENSITIVE_DATA: 'sensitive_data',
  // Declaração de maioridade (18+) — caixa própria desde a revisão de LGPD
  // de 2026-11-18; o servidor recusa termos sem ela (api/record-consent.js).
  ADULT: 'adult',
  // Opcionais: precisam vir desmarcados e a recusa não pode impedir o uso.
  MARKETING_EMAIL: 'marketing_email',
  PUBLIC_PROFILE: 'public_profile',
  // Escrita assistida: o texto que a pessoa escreve vai para o modelo de
  // IA, fora do Brasil. Sem ele, os endpoints de IA respondem 403
  // ai_consent_required (api/_lib/aiBudget.js) e o app pede na hora
  // (src/privacy/aiConsentGate.js).
  AI_PROCESSING: 'ai_processing',
  // E-mail do resumo semanal — opt-out (sem linha = recebe).
  WEEKLY_EMAIL: 'weekly_email',
}

export const REQUIRED_PURPOSES = [PURPOSES.TERMS, PURPOSES.SENSITIVE_DATA, PURPOSES.ADULT]

// Envia o conjunto de escolhas para registro no servidor. Falha em silêncio
// de propósito: um erro de rede aqui não pode travar o cadastro de quem já
// concordou na tela. O retry acontece no próximo login (ver ensureConsents).
// Sem sessão ainda (cadastro com confirmação de e-mail ligada: signup() não
// devolve sessão), as escolhas ficam guardadas no aparelho e são enviadas
// na primeira entrada com sessão (flushPendingConsents, chamada por
// App.jsx) — antes se perdiam e toda conta nova caía na tela de
// reconsentimento (varredura 2026-10-25).
const PENDING_KEY = 'jc_pending_consents'

// Guarda escolhas para enviar depois — usado antes de entrar com
// Google/Apple (LoginScreen): a conta pode nascer no retorno do provedor, e
// o consentimento precisa vir antes disso. flushPendingConsents envia na
// primeira entrada com sessão.
export function savePendingConsents(consents) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(consents)) } catch { /* sem localStorage */ }
}

export async function flushPendingConsents() {
  let pending = null
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null') } catch { /* sem localStorage */ }
  if (!Array.isArray(pending) || pending.length === 0) return false
  const ok = await recordConsents(pending)
  if (ok) { try { localStorage.removeItem(PENDING_KEY) } catch { /* ignora */ } }
  return ok
}

export async function recordConsents(consents, { silent = true } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(consents)) } catch { /* sem localStorage */ }
      throw new Error('not_authenticated')
    }

    const res = await fetch('/api/record-consent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consents, policyVersion: POLICY_VERSION }),
    })
    if (!res.ok) throw new Error(`record_consent_failed_${res.status}`)
    return true
  } catch (err) {
    console.error('Falha ao registrar consentimento', err)
    if (!silent) throw err
    return false
  }
}

// Estado atual por finalidade: a linha mais recente de cada uma vence, já que
// a tabela é append-only e revogar grava uma linha nova.
export async function getMyConsents() {
  const { data, error } = await supabase
    .from('consents')
    .select('purpose, granted, policy_version, created_at')
    .order('created_at', { ascending: false })

  // Lança (não devolve {}) — devolver vazio virava "falta consentir" e
  // mandava quem já consentiu pra tela de reconsentimento a cada falha de
  // rede; os chamadores já têm .catch(() => false) (varredura 2026-10-25).
  if (error) throw new Error(`consents_read_failed: ${error.message}`)

  const latest = {}
  for (const row of data ?? []) {
    if (!(row.purpose in latest)) latest[row.purpose] = row
  }
  return latest
}

// True quando falta consentimento obrigatório, ou quando o que existe é de
// uma versão anterior da política. Quem chamar deve reapresentar a tela.
//
// Falha FECHADA (revisão de LGPD, 2026-11-18): antes, um erro de leitura
// virava "não precisa" e uma conta nova entrava sem consentimento nenhum.
// Agora, sem conseguir ler, vale o que este aparelho já confirmou para esta
// pessoa nesta versão da política (guardado quando a leitura dá certo) —
// quem já consentiu continua usando sem rede; quem nunca confirmou aqui vê
// a tela de consentimento.
const CONFIRMED_KEY = userId => `jc_consent_ok:${userId}:${POLICY_VERSION}`

export function isConsentMissing(latest) {
  return REQUIRED_PURPOSES.some(p => {
    const row = latest[p]
    return !row || !row.granted || row.policy_version !== POLICY_VERSION
  })
}

export async function needsConsentRefresh(userId) {
  try {
    const missing = isConsentMissing(await getMyConsents())
    try {
      if (userId && !missing) localStorage.setItem(CONFIRMED_KEY(userId), '1')
      if (userId && missing) localStorage.removeItem(CONFIRMED_KEY(userId))
    } catch { /* sem localStorage */ }
    return missing
  } catch (err) {
    console.error('Falha ao conferir o consentimento', err)
    try { return !(userId && localStorage.getItem(CONFIRMED_KEY(userId)) === '1') } catch { return true }
  }
}

// Estado atual das finalidades opcionais, com o padrão de cada uma quando
// ainda não há linha — para a tela de Privacidade.
const DEFAULT_WHEN_MISSING = { marketing_email: false, public_profile: false, ai_processing: false, weekly_email: true }
export async function getOptionalConsentState() {
  const latest = await getMyConsents()
  const state = {}
  for (const [purpose, fallback] of Object.entries(DEFAULT_WHEN_MISSING)) {
    state[purpose] = latest[purpose] ? latest[purpose].granted : fallback
  }
  return state
}

// Liga/desliga uma finalidade opcional. Revogar grava granted=false (a
// tabela é append-only). Lança em caso de erro: a tela precisa saber.
export async function setConsent(purpose, granted) {
  if (REQUIRED_PURPOSES.includes(purpose)) throw new Error('required_purpose')
  await recordConsents([{ purpose, granted }], { silent: false })
}
