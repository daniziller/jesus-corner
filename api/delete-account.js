// Exclusão de conta pela própria pessoa, no app (Perfil → Excluir conta).
// O trabalho todo está em api/_lib/eraseAccount.js, o mesmo que a equipe
// usa quando o pedido chega por e-mail (api/admin/person.js).
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { eraseAccount } from './_lib/eraseAccount.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'unauthorized' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData?.user) return res.status(401).json({ error: 'unauthorized' })

  const { id: userId, email } = userData.user

  // Confirmação explícita: o cliente precisa mandar o próprio email. Evita
  // que um clique acidental (ou um CSRF) destrua a conta.
  const confirmation = (req.body?.confirmEmail || '').trim().toLowerCase()
  if (!email || confirmation !== email.toLowerCase()) {
    return res.status(400).json({ error: 'confirmation_mismatch' })
  }

  const result = await eraseAccount({ userId, email, db: supabaseAdmin, stripe })
  if (!result.ok) return res.status(500).json({ error: 'deletion_incomplete', steps: result.steps })
  return res.status(200).json({ ok: true, steps: result.steps })
}
