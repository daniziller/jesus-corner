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

// Exportado à parte de requireAdmin — usado por endpoints que não são
// admin-only, mas que precisam dar um tratamento especial pra conta da
// Daniela sem travar o resto do fluxo (ex: pular o limite mensal de planos
// por tema em api/generate-theme-plan.js).
export function isAdminEmail(email) {
  return adminEmails().includes((email ?? '').toLowerCase())
}

// Verificação em duas etapas (revisão de LGPD, 2026-11-18 — art. 46): o
// painel mostra e-mail, progresso, denúncias e perguntas das pessoas, então
// só e-mail + senha não basta. O token precisa ser aal2 (Supabase MFA, com
// app autenticador) — o painel leva a admin a cadastrar o autenticador na
// primeira vez (src/admin/AdminMfaGate.jsx). ADMIN_REQUIRE_MFA=false
// desliga, como saída de emergência (ex.: perdeu o celular), nunca como
// padrão.
export function adminMfaRequired() {
  return process.env.ADMIN_REQUIRE_MFA !== 'false'
}

// O nível de garantia (aal1/aal2) vem no próprio token, que getUser() já
// validou com o Supabase antes de lermos o campo.
export function tokenAal(authHeader) {
  try {
    const payload = authHeader.replace(/^Bearer\s+/i, '').split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).aal ?? 'aal1'
  } catch {
    return 'aal1'
  }
}

let admin = null
function supabaseAdmin() {
  if (!admin) admin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  return admin
}

// Registro de acesso (0085): quem, qual endpoint, qual operação e de quem.
async function logAccess(req, user, aal) {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const target = body.userId ?? body.recipientUserId ?? req.query?.userId ?? null
    const uuid = /^[0-9a-f-]{36}$/i
    await supabaseAdmin().from('admin_access_log').insert({
      admin_id: user.id,
      path: String(req.url ?? '').split('?')[0].slice(0, 200),
      op: typeof body.op === 'string' ? body.op.slice(0, 60) : null,
      target_user_id: typeof target === 'string' && uuid.test(target) ? target : null,
      aal,
    })
  } catch (err) {
    console.error('[adminAuth] não registrou o acesso:', err?.message ?? err)
  }
}

// Em caso de falha já escreve a resposta (401/403) e devolve null — quem
// chama só precisa fazer:
//   const caller = await requireAdmin(req, res)
//   if (!caller) return
// `allowWithoutMfa`: só o /api/admin/check, que diz ao painel se falta a
// segunda etapa. `log: false`: não registra (o próprio check).
export async function requireAdmin(req, res, { allowWithoutMfa = false, log = true } = {}) {
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

  if (!isAdminEmail(userData.user.email)) {
    res.status(403).json({ error: 'forbidden' })
    return null
  }

  const aal = tokenAal(authHeader)
  if (!allowWithoutMfa && adminMfaRequired() && aal !== 'aal2') {
    res.status(403).json({ error: 'mfa_required' })
    return null
  }

  if (log) await logAccess(req, userData.user, aal)
  return Object.assign(userData.user, { aal })
}
