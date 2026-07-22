// Ferramenta pontual pra alternar o status de assinatura da própria conta
// de teste do dono do app, protegida checando que quem chama é um dos
// ADMIN_EMAILS — usada aqui só pra verificar ao vivo o paywall (isPremium
// false) e depois restaurar. Mesmo padrão de api/admin-grant-premium.js
// (já removido depois de usado uma vez); este também será removido depois.
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['daniziller@hotmail.com']

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (callerErr || !callerData?.user || !ADMIN_EMAILS.includes(callerData.user.email)) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const { email, status } = req.body || {}
  if (!email || !status || !['active', 'canceled'].includes(status)) {
    return res.status(400).json({ error: 'missing_or_invalid_params' })
  }
  if (email !== callerData.user.email) {
    return res.status(403).json({ error: 'can_only_modify_own_account' })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', callerData.user.id)
  if (updateErr) {
    return res.status(500).json({ error: 'update_failed', detail: updateErr.message })
  }

  return res.status(200).json({ ok: true, status })
}
