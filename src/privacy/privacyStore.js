// Direitos do titular (LGPD art. 18) — exclusão de conta e exportação de
// dados. Fica separado de billing/subscriptionStore.js porque é outro
// assunto, ainda que a exclusão precise cancelar a assinatura por baixo.
import { supabase } from '../lib/supabaseClient'

async function authorized(path, { method = 'POST', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not_authenticated')

  const res = await fetch(path, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = `request_failed_${res.status}`
    try { detail = (await res.json()).error ?? detail } catch { /* corpo não-JSON */ }
    throw new Error(detail)
  }
  return res
}

// Baixa um JSON com tudo que o app guarda sobre a pessoa. O download é
// disparado aqui mesmo — o endpoint já manda Content-Disposition.
export async function exportMyData() {
  const res = await authorized('/api/export-my-data')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jesus-corner-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Exclui a conta em definitivo. `confirmEmail` precisa bater com o email da
// sessão — o servidor recusa se não bater, então um clique acidental não
// destrói nada. Depois de excluir, a sessão local não vale mais.
export async function deleteMyAccount(confirmEmail) {
  await authorized('/api/delete-account', { body: { confirmEmail } })
  await supabase.auth.signOut().catch(() => { /* o usuário já não existe */ })
}
