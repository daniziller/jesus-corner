import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../_lib/adminAuth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const caller = await requireAdmin(req, res)
  if (!caller) return

  const { id } = req.body ?? {}
  if (!id) return res.status(400).json({ error: 'missing_fields' })

  const { data: invite, error: fetchErr } = await supabaseAdmin
    .from('admin_invites')
    .select('id, kind, status, stripe_promotion_code_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr || !invite) return res.status(404).json({ error: 'not_found' })
  if (invite.status !== 'pending') return res.status(400).json({ error: 'not_pending' })

  if (invite.kind === 'discount' && invite.stripe_promotion_code_id) {
    await stripe.promotionCodes.update(invite.stripe_promotion_code_id, { active: false }).catch(err => {
      console.error('Failed to deactivate Stripe promotion code:', err.message)
    })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('admin_invites')
    .update({ status: 'revoked' })
    .eq('id', id)

  if (updateErr) {
    console.error('Failed to revoke invite:', updateErr.message)
    return res.status(500).json({ error: 'update_failed' })
  }

  return res.status(200).json({ ok: true })
}
