// "Quando terminar" (35j) — o que fazer quando o estudo ativo chegar ao
// fim: study_auto_next/study_return_days (migration 0058). Só a preferência
// mora aqui; o gatilho que as consome (detectar fim de estudo) ainda não
// existe — ver comentário da migration.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getStudyFinishPrefs() {
  const row = await fetchRow()
  return {
    autoNext: !!row?.study_auto_next,
    returnDays: row?.study_return_days ?? true,
  }
}

export async function setStudyFinishPrefs(patch) {
  const columnPatch = {}
  if ('autoNext' in patch) columnPatch.study_auto_next = !!patch.autoNext
  if ('returnDays' in patch) columnPatch.study_return_days = !!patch.returnDays
  await updateRow(columnPatch)
}
