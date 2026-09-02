// Lógica de concessão de acesso grátis compartilhada entre
// api/redeem-invite-code.js (resgate manual, por código) e
// api/apply-pending-invite.js (automático, por e-mail no login) — as duas
// vias precisam terminar exatamente na mesma gravação, então fica num só
// lugar em vez de duplicar (isso mexe com acesso/dinheiro, divergir os dois
// caminhos seria fácil de não notar).
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function grantFreeAccessFromInvite(invite, userId) {
  // Reivindica o convite PRIMEIRO, de forma atômica (.eq('status','pending')
  // no UPDATE + .select() pra saber quantas linhas realmente mudaram) — e só
  // concede acesso se essa reivindicação realmente afetou a linha. Na ordem
  // antiga (conceder acesso, depois marcar como reivindicado), um UPDATE que
  // não casa nenhuma linha não vira erro no PostgREST, então duas chamadas
  // simultâneas pro mesmo código (de uso único) passavam as duas pelo
  // "claimErr" silencioso e as duas ganhavam acesso vitalício grátis.
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from('admin_invites')
    .update({ status: 'claimed', claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', invite.id)
    .eq('status', 'pending')
    .select('id')
  if (claimErr) throw new Error(`claim_failed: ${claimErr.message}`)
  if (!claimed || claimed.length === 0) throw new Error('already_claimed')

  const { error: upsertErr } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    access_type: 'lifetime',
    tier: 'premium_ai',
    status: 'active',
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) {
    // Não deixa o convite "queimado" sem ninguém ter recebido o benefício —
    // devolve pro estado pendente pra próxima tentativa poder reivindicar.
    await supabaseAdmin.from('admin_invites')
      .update({ status: 'pending', claimed_by: null, claimed_at: null })
      .eq('id', invite.id)
      .catch(() => {})
    throw new Error(`grant_failed: ${upsertErr.message}`)
  }
}

export { supabaseAdmin }
