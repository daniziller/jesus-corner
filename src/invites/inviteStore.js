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

// Só confere o código (sem sessão, sem consumir) — usado no formulário de
// cadastro pra mostrar o benefício ANTES de submeter, ver SignupStep em
// AuthScreen.jsx. Devolve { valid: false } ou { valid: true, kind,
// discountPercent, discountDuration }.
export async function validateInviteCode(code) {
  const res = await fetch('/api/validate-invite-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error(`request_failed_${res.status}`)
  return res.json()
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

// Guarda o código digitado no cadastro pra sobreviver ao desvio de
// confirmação de email — o projeto sempre exige confirmar o email antes de
// criar sessão (signUp() nunca devolve session nesse caso, ver
// needsEmailConfirmation em authStore.js), e o link de confirmação faz um
// redirect de página inteira (via /auth/v1/verify do próprio Supabase, ver
// api/auth-email-hook.js), o que apaga todo o estado do React — incluindo o
// código que a pessoa tinha acabado de digitar no formulário. Sem isso, o
// código nunca chegava a ser resgatado: SignupStep.submit() retorna assim
// que vê needsEmailConfirmation, antes mesmo de tentar redeemInviteCode.
const PENDING_CODE_KEY = 'jc_pending_invite_code'

export function savePendingInviteCode(code) {
  const trimmed = (code ?? '').trim()
  if (trimmed) localStorage.setItem(PENDING_CODE_KEY, trimmed)
}

// Chamado no bootstrap (ver src/App.jsx), junto de applyPendingInvite() —
// tenta resgatar o código salvo (se houver) assim que a pessoa volta com
// uma sessão de verdade (depois de confirmar o email), e sempre limpa a
// chave depois, sucesso ou não — não deve tentar de novo a cada login,
// senão um código já usado/errado vira erro repetido pra sempre.
export async function redeemPendingInviteCode() {
  const code = localStorage.getItem(PENDING_CODE_KEY)
  if (!code) return false
  localStorage.removeItem(PENDING_CODE_KEY)
  try {
    const { applied } = await redeemInviteCode(code)
    return applied === 'free'
  } catch {
    return false
  }
}
