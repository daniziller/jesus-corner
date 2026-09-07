// Qual Estudo guiado está ativo no momento (o passo "study" da rotina
// avança sessão a sessão nele, dia após dia) — ver 0037_active_study.sql.
// Mesmo padrão fino de themePlansStore.js sobre fetchRow/updateRow.
//
// Turno 35 (35b/35j): ativar um estudo pausa o plano principal — guarda
// junto ONDE ele pausou (pausedAtBook/pausedAtChapter, pro cartão "Gênesis
// pausado em 41") e QUANDO ele volta (resumesAt, "volta quarta, 10 de
// setembro" — ver src/studies/activeStudyMath.js). Continua um blob só
// (mesma coluna jsonb de sempre) — sem migration nova.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getActiveStudy() {
  const row = await fetchRow()
  return row?.active_study ?? null
}

export async function getActiveStudyId(_email) {
  const row = await fetchRow()
  return row?.active_study?.studyId ?? null
}

// `pause` — { book, chapter, resumesAt } (dateKey), só usado ao ATIVAR
// (studyId truthy); null/undefined ao desativar limpa tudo.
export async function setActiveStudyId(_email, studyId, pause) {
  const value = studyId ? { studyId, pausedAtBook: pause?.book ?? null, pausedAtChapter: pause?.chapter ?? null, resumesAt: pause?.resumesAt ?? null } : null
  const updated = await updateRow({ active_study: value })
  return updated?.active_study?.studyId ?? null
}
