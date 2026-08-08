import { supabase } from '../lib/supabaseClient'

// Mesmo helper local já duplicado em src/admin/adminStore.js e
// src/billing/subscriptionStore.js — padrão já estabelecido no projeto.
async function authorizedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  return res.json()
}

// Resgate manual — devolve { applied: 'free' | 'discount_pending' }.
export async function redeemInviteCode(code) {
  return authorizedPost('/api/redeem-invite-code', { code })
}

// Chamado automaticamente a cada login (ver src/App.jsx) — nunca deixa o
// erro subir, mesmo espírito de checkIsAdmin() em adminStore.js.
export async function applyPendingInvite() {
  try {
    const { applied } = await authorizedPost('/api/apply-pending-invite')
    return applied === true
  } catch {
    return false
  }
}
