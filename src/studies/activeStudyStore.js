// Qual Estudo guiado está ativo no momento (o passo "study" da rotina
// avança sessão a sessão nele, dia após dia) — ver 0037_active_study.sql.
// Mesmo padrão fino de themePlansStore.js sobre fetchRow/updateRow.
//
// Até 2026-09-08, ativar um estudo PAUSAVA a leitura contínua até uma data
// de fim calculada (pausedAtBook/pausedAtChapter/resumesAt) — modelo
// abandonado na conferência do handoff-app-completo (Bíblia e Estudo têm
// trilhas independentes, cada uma com seus próprios dias — ver
// stepDaysMath.js — e podem coincidir no mesmo dia; a leitura nunca fica
// "pausada", só não cai nos dias que não são dela). O campo virou só o id
// do estudo — "Encerrar" (35j, StudyOrganizeScreen.jsx) já cobre "sair do
// estudo antes do fim", sem precisar de um "Retomar já" à parte em 35b.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getActiveStudyId(_email) {
  const row = await fetchRow()
  return row?.active_study?.studyId ?? null
}

export async function setActiveStudyId(_email, studyId) {
  const updated = await updateRow({ active_study: studyId ? { studyId } : null })
  return updated?.active_study?.studyId ?? null
}
