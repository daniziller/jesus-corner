// Gate compartilhado por todo endpoint em api/admin/*.js — mesmo padrão de
// auth de api/verify-google-play-purchase.js (Bearer token -> auth.getUser())
// mais uma checagem contra a allowlist ADMIN_EMAILS (env var, nunca VITE_*,
// nunca exposta ao client). Não existe coluna is_admin nem role no banco de
// propósito — só a Daniela usa isso por enquanto, e uma allowlist de email
// checada sempre no servidor já é suficiente.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

// Em caso de falha já escreve a resposta (401/403) e devolve null — quem
// chama só precisa fazer:
//   const caller = await requireAdmin(req, res)
//   if (!caller) return
export async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error } = await supabase.auth.getUser()
  if (error || !userData?.user) {
    res.status(401).json({ error: 'unauthorized' })
    return null
  }

  const callerEmail = (userData.user.email ?? '').toLowerCase()
  if (!adminEmails().includes(callerEmail)) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }

  return userData.user
}
