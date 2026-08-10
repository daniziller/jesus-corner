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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const PURPOSES = ['terms', 'sensitive_data', 'marketing_email', 'public_profile']

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

  // O IP compõe a prova de origem do ato. x-forwarded-for pode trazer uma
  // cadeia de proxies — o primeiro endereço é o do cliente.
  const ip = (req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || null

  const rows = consents.map(c => ({
    user_id: userData.user.id,
    purpose: c.purpose,
    granted: c.granted,
    policy_version: String(policyVersion),
    ip,
    user_agent: (req.headers['user-agent'] ?? '').slice(0, 500) || null,
  }))

  const { error } = await supabaseAdmin.from('consents').insert(rows)
  if (error) {
    console.error('record-consent: falha ao gravar', error)
    return res.status(500).json({ error: 'insert_failed' })
  }

  return res.status(200).json({ ok: true, recorded: rows.length })
}
