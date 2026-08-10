// Consentimento em camadas — uma finalidade por vez, como manda o art. 8º,
// §4º da LGPD (consentimento para finalidades genéricas é nulo).
//
// Por que o app precisa disso e não basta o "aceito os termos": num app de
// leitura bíblica, a existência da conta já revela convicção religiosa, que
// o art. 5º, II classifica como dado sensível. Para dado sensível o art. 11
// não oferece legítimo interesse — sobra consentimento específico e
// destacado, por finalidade.
import { supabase } from '../lib/supabaseClient'

// Suba esta versão sempre que o texto da política mudar de forma relevante.
// Ela é gravada junto de cada consentimento, para saber exatamente com o que
// a pessoa concordou naquele dia.
export const POLICY_VERSION = '2026-08-10'

export const PURPOSES = {
  // Obrigatórios: sem eles não há como operar o serviço contratado.
  TERMS: 'terms',
  SENSITIVE_DATA: 'sensitive_data',
  // Opcionais: precisam vir desmarcados e a recusa não pode impedir o uso.
  MARKETING_EMAIL: 'marketing_email',
  PUBLIC_PROFILE: 'public_profile',
}

export const REQUIRED_PURPOSES = [PURPOSES.TERMS, PURPOSES.SENSITIVE_DATA]

// Envia o conjunto de escolhas para registro no servidor. Falha em silêncio
// de propósito: um erro de rede aqui não pode travar o cadastro de quem já
// concordou na tela. O retry acontece no próximo login (ver ensureConsents).
export async function recordConsents(consents, { silent = true } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('not_authenticated')

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

  if (error) { console.error('Falha ao ler consentimentos', error); return {} }

  const latest = {}
  for (const row of data ?? []) {
    if (!(row.purpose in latest)) latest[row.purpose] = row
  }
  return latest
}

// True quando falta consentimento obrigatório, ou quando o que existe é de
// uma versão anterior da política. Quem chamar deve reapresentar a tela.
export async function needsConsentRefresh() {
  const latest = await getMyConsents()
  return REQUIRED_PURPOSES.some(p => {
    const row = latest[p]
    return !row || !row.granted || row.policy_version !== POLICY_VERSION
  })
}
