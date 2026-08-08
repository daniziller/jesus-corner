// Chamado automaticamente a cada login/bootstrap (ver src/App.jsx) — se o
// e-mail da conta logada bater com um convite de acesso grátis pendente,
// aplica sozinho, sem precisar digitar código nenhum. Convite de desconto
// não passa por aqui: api/create-checkout-session.js já resolve isso
// direto na hora do checkout, olhando pelo e-mail.
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

  const { data: invite, error: fetchErr } = await supabaseAdmin
    .from('admin_invites')
    .select('id, kind, status')
    .eq('kind', 'free')
    .eq('status', 'pending')
    .ilike('email', caller.email)
    .maybeSingle()

  if (fetchErr) {
    console.error('Failed to look up pending invite:', fetchErr.message)
    return res.status(200).json({ applied: false })
  }
  if (!invite) return res.status(200).json({ applied: false })

  try {
    await grantFreeAccessFromInvite(invite, caller.id)
  } catch (err) {
    console.error('Failed to auto-apply pending invite:', err.message)
    return res.status(200).json({ applied: false })
  }

  return res.status(200).json({ applied: true })
}
