// Planos de leitura por tema (IA) — guardados no backend (tabela user_data,
// coluna theme_plans, um array de planos). Mesmo padrão de notesStore.js/
// studiesProgressStore.js: wrapper fino sobre fetchRow/updateRow/
// withRowLock de src/backend/userDataStore.js.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { supabase } from '../lib/supabaseClient'

// Chama api/generate-theme-plan.js (mesmo padrão de authorizedPost em
// src/billing/subscriptionStore.js: pega o token da sessão atual, manda no
// header). Devolve o plano PRONTO — quem chamar ainda precisa salvar com
// saveThemePlan pra persistir.
export async function generateThemePlan(theme, minutesPerSession, lang) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-theme-plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, minutesPerSession, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.plan
}

export async function getThemePlans(_email) {
  const row = await fetchRow()
  return row?.theme_plans ?? []
}

// Cria (ou substitui, se já existir um com o mesmo id — ex: gerar de novo)
// um plano. Entra no topo da lista, mais recente primeiro.
export function saveThemePlan(_email, plan) {
  return withRowLock(async () => {
    const plans = await getThemePlans(_email)
    const next = [plan, ...plans.filter(p => p.id !== plan.id)]
    const updated = await updateRow({ theme_plans: next })
    return updated?.theme_plans ?? next
  })
}

export function deleteThemePlan(_email, planId) {
  return withRowLock(async () => {
    const plans = await getThemePlans(_email)
    const next = plans.filter(p => p.id !== planId)
    const updated = await updateRow({ theme_plans: next })
    return updated?.theme_plans ?? next
  })
}
