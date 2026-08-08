// Lógica de concessão de acesso grátis compartilhada entre
// api/redeem-invite-code.js (resgate manual, por código) e
// api/apply-pending-invite.js (automático, por e-mail no login) — as duas
// vias precisam terminar exatamente na mesma gravação, então fica num só
// lugar em vez de duplicar (isso mexe com acesso/dinheiro, divergir os dois
// caminhos seria fácil de não notar).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function grantFreeAccessFromInvite(invite, userId) {
  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    access_type: 'lifetime',
    status: 'active',
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) throw new Error(`grant_failed: ${upsertErr.message}`)

  const { error: claimErr } = await supabaseAdmin
    .from('admin_invites')
    .update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('status', 'pending')
  if (claimErr) throw new Error(`claim_failed: ${claimErr.message}`)
}

export { supabaseAdmin }
