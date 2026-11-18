// Registro de consentimento — art. 6º, X da LGPD ("comprovação da adoção de
// medidas eficazes"). Consentimento sem prova de quando, em que versão do
// texto e a partir de onde não é demonstrável em fiscalização.
//
// Grava no servidor, nunca pelo cliente direto: se o app pudesse inserir na
// tabela, o registro não provaria nada — qualquer um poderia forjar. Por isso
// consents só tem policy de SELECT (ver migration 0025).
//
// A tabela é append-only. Revogar não faz UPDATE: grava uma linha nova com
// granted=false, preservando o histórico.
import { createClient } from '@supabase/supabase-js'
import { POLICY_VERSION } from '../src/privacy/policyVersion.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// adult: declaração de maioridade (18+). ai_processing: escrita assistida
// (texto da pessoa vai pro modelo, fora do Brasil). weekly_email: e-mail do
// resumo semanal. Ver src/privacy/consent.js e a migração 0083.
const PURPOSES = ['terms', 'sensitive_data', 'adult', 'marketing_email', 'public_profile', 'ai_processing', 'weekly_email']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const { consents, policyVersion } = req.body ?? {}
  if (!Array.isArray(consents) || !consents.length || !policyVersion) {
    return res.status(400).json({ error: 'invalid_payload' })
  }

  const invalid = consents.find(c => !PURPOSES.includes(c.purpose) || typeof c.granted !== 'boolean')
  if (invalid) return res.status(400).json({ error: 'invalid_purpose' })

  // Idade mínima (18+) conferida aqui, no servidor: aceitar os termos exige
  // a declaração de maioridade no mesmo envio. Sem ela, nada é gravado — e
  // sem termos gravados o app não deixa entrar (needsConsentRefresh).
  const grantsTerms = consents.some(c => c.purpose === 'terms' && c.granted)
  const declaresAdult = consents.some(c => c.purpose === 'adult' && c.granted)
  if (grantsTerms && !declaresAdult) return res.status(400).json({ error: 'adult_required' })

  // A versão gravada é a do servidor, não a que o app mandou: um app
  // desatualizado não consegue registrar aceite de uma versão que não viu.
  if (String(policyVersion) !== POLICY_VERSION) return res.status(409).json({ error: 'policy_version_mismatch' })

  // O IP compõe a prova de origem do ato. x-forwarded-for pode trazer uma
  // cadeia de proxies — o primeiro endereço é o do cliente.
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || null

  const rows = consents.map(c => ({
    user_id: userData.user.id,
    purpose: c.purpose,
    granted: c.granted,
    policy_version: POLICY_VERSION,
    ip,
    user_agent: (req.headers['user-agent'] ?? '').slice(0, 500) || null,
  }))

  const { error } = await supabaseAdmin.from('consents').insert(rows)
  if (error) {
    console.error('record-consent: falha ao gravar:', error.message)
    return res.status(500).json({ error: 'insert_failed' })
  }

  return res.status(200).json({ ok: true, recorded: rows.length })
}
