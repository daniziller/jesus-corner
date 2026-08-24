// Estudos indutivos — método Observação/Interpretação/Verdade Atemporal/
// Aplicação, guardado no backend (tabela user_data, coluna
// inductive_studies, um array). Diferente de
// aiStudiesStore.js: aqui o CONTEÚDO de cada sessão é escrito pela própria
// pessoa (não gerado por IA nem pré-escrito), e as sessões (passagens) vão
// sendo adicionadas aos poucos, uma de cada vez, em vez de vir todo o
// estudo pronto de uma partida. Mesmo padrão fino de sermonNotesStore.js/
// aiStudiesStore.js sobre fetchRow/updateRow/withRowLock — cada save
// substitui o estudo inteiro (id igual), então quem chama sempre manda o
// objeto atualizado por completo (incluindo o array de sessões).
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getInductiveStudies(_email) {
  const row = await fetchRow()
  return row?.inductive_studies ?? []
}

export function saveInductiveStudy(_email, study) {
  return withRowLock(async () => {
    const studies = await getInductiveStudies(_email)
    const next = [study, ...studies.filter(s => s.id !== study.id)]
    const updated = await updateRow({ inductive_studies: next })
    return updated?.inductive_studies ?? next
  })
}

export function deleteInductiveStudy(_email, studyId) {
  return withRowLock(async () => {
    const studies = await getInductiveStudies(_email)
    const next = studies.filter(s => s.id !== studyId)
    const updated = await updateRow({ inductive_studies: next })
    return updated?.inductive_studies ?? next
  })
}
