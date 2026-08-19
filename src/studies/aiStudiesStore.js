// Estudos temáticos criados por IA — guardados no backend (tabela
// user_data, coluna ai_studies, um array de estudos). Mesmo padrão de
// themePlansStore.js: wrapper fino sobre fetchRow/updateRow/withRowLock.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { supabase } from '../lib/supabaseClient'

// Chama api/generate-study.js (mesmo padrão de generateThemePlan em
// themePlansStore.js). Devolve o estudo PRONTO — quem chamar ainda precisa
// salvar com saveAiStudy pra persistir.
export async function generateStudy(title, scope, lang) {
  const { data: { session: authSession } } = await supabase.auth.getSession()
  if (!authSession) throw new Error('not_authenticated')
  const res = await fetch('/api/generate-study', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, scope, lang }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `request_failed_${res.status}`)
  return body.study
}

export async function getAiStudies(_email) {
  const row = await fetchRow()
  return row?.ai_studies ?? []
}

export function saveAiStudy(_email, study) {
  return withRowLock(async () => {
    const studies = await getAiStudies(_email)
    const next = [study, ...studies.filter(s => s.id !== study.id)]
    const updated = await updateRow({ ai_studies: next })
    return updated?.ai_studies ?? next
  })
}

export function deleteAiStudy(_email, studyId) {
  return withRowLock(async () => {
    const studies = await getAiStudies(_email)
    const next = studies.filter(s => s.id !== studyId)
    const updated = await updateRow({ ai_studies: next })
    return updated?.ai_studies ?? next
  })
}
