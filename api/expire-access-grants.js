// Vencimento de acesso de cortesia (handoff-admin-42, 42h) — cron diário.
// "Vencimento avisa o Master antes" (Regra 6.5) já acontece na própria
// tela (42h mostra "vence em N d" em laranja quando está perto — o Master
// vê isso toda vez que abre Acessos, decide se revoga antes ou deixa
// vencer); este cron só faz o corte de verdade quando o prazo passa e
// ninguém revogou/renovou antes — reverte a assinatura pra 'none', sem
// mexer em quem já é vitalício (expires_at nulo, nunca entra aqui).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('expire-access-grants: CRON_SECRET não configurado')
    return res.status(500).json({ error: 'server misconfigured' })
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { data: expired, error } = await supabaseAdmin
    .from('access_grants')
    .select('id, user_id')
    .is('revoked_at', null)
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
  if (error) {
    console.error('expire-access-grants: falha ao buscar vencidos', error)
    return res.status(500).json({ error: error.message })
  }

  let reverted = 0
  for (const grant of expired ?? []) {
    // Só reverte se não sobrou outro grant vigente pra mesma pessoa (ex:
    // renovou com um grant novo antes deste vencer) — não derruba acesso
    // que já foi renovado por engano.
    const { count } = await supabaseAdmin
      .from('access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', grant.user_id)
      .is('revoked_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    if (count > 0) continue

    await supabaseAdmin.from('subscriptions').update({ status: 'none', updated_at: new Date().toISOString() }).eq('user_id', grant.user_id)
    await supabaseAdmin.from('access_grants').update({ revoked_at: new Date().toISOString() }).eq('id', grant.id)
    reverted += 1
  }

  return res.status(200).json({ checked: (expired ?? []).length, reverted })
}
