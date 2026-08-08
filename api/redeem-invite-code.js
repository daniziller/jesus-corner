// Resgate manual de um convite por código (ver api/admin/create-invite.js) —
// cobre o caso de a pessoa logar/assinar com um e-mail diferente do que foi
// convidado. kind='free' libera acesso na hora; kind='discount' só faz o
// "rebind" do e-mail do convite pro e-mail de quem resgatou, pra
// api/create-checkout-session.js encontrar e aplicar o coupon automaticamente
// no próximo checkout — o Stripe Promotion Code (mesmo texto do código)
// também continua funcionando direto na tela do Stripe, como caminho
// alternativo.
import { createClient } from '@supabase/supabase-js'
import { grantFreeAccessFromInvite, supabaseAdmin } from './_lib/invites.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })
  const caller = userData.user

  const code = (req.body?.code ?? '').trim().toUpperCase()
  if (!code) return res.status(400).json({ error: 'missing_code' })

  const { data: invite, error: fetchErr } = await supabaseAdmin
    .from('admin_invites')
    .select('id, kind, email, status')
    .eq('code', code)
    .maybeSingle()

  if (fetchErr) {
    console.error('Failed to look up invite code:', fetchErr.message)
    return res.status(500).json({ error: 'query_failed' })
  }
  if (!invite || invite.status !== 'pending') {
    return res.status(404).json({ error: 'invalid_or_used_code' })
  }

  if (invite.kind === 'free') {
    try {
      await grantFreeAccessFromInvite(invite, caller.id)
    } catch (err) {
      console.error('Failed to grant free access from code:', err.message)
      return res.status(500).json({ error: 'grant_failed' })
    }
    return res.status(200).json({ applied: 'free' })
  }

  // kind === 'discount' — rebind pro e-mail de quem resgatou, permanece
  // 'pending' até o checkout de verdade usar (ver create-checkout-session.js).
  const { error: rebindErr } = await supabaseAdmin
    .from('admin_invites')
    .update({ email: caller.email.toLowerCase() })
    .eq('id', invite.id)
    .eq('status', 'pending')

  if (rebindErr) {
    console.error('Failed to rebind discount invite:', rebindErr.message)
    return res.status(500).json({ error: 'rebind_failed' })
  }

  return res.status(200).json({ applied: 'discount_pending' })
}
