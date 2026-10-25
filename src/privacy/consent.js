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
// 2026-09-02: Política de Privacidade §3 passou a divulgar a OpenAI como
// sub-processador (conversão de texto bíblico em voz, sem dado pessoal),
// além da identificação da Encarregada e do direito de reclamar à ANPD.
export const POLICY_VERSION = '2026-09-02'

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
// Sem sessão ainda (cadastro com confirmação de e-mail ligada: signup() não
// devolve sessão), as escolhas ficam guardadas no aparelho e são enviadas
// na primeira entrada com sessão (flushPendingConsents, chamada por
// App.jsx) — antes se perdiam e toda conta nova caía na tela de
// reconsentimento (varredura 2026-10-25).
const PENDING_KEY = 'jc_pending_consents'

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
export async function needsConsentRefresh() {
  const latest = await getMyConsents()
  return REQUIRED_PURPOSES.some(p => {
    const row = latest[p]
    return !row || !row.granted || row.policy_version !== POLICY_VERSION
  })
}
