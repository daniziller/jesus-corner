// Qual Estudo guiado está ativo no momento (o passo "study" da rotina
// avança sessão a sessão nele, dia após dia) — ver 0037_active_study.sql.
// Mesmo padrão fino de themePlansStore.js sobre fetchRow/updateRow.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getActiveStudyId(_email) {
  const row = await fetchRow()
  return row?.active_study?.studyId ?? null
}

export async function setActiveStudyId(_email, studyId) {
  const updated = await updateRow({ active_study: studyId ? { studyId } : null })
  return updated?.active_study?.studyId ?? null
}
