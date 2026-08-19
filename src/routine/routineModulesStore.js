// Quais passos entram na rotina diária da pessoa (Oração/Leitura/Estudo
// guiado/Reflexão) — independente de qual plano de leitura está ativo (ver
// 0036_routine_modules.sql). Mesmo padrão fino de themePlansStore.js sobre
// fetchRow/updateRow.
import { fetchRow, updateRow } from '../backend/userDataStore'

export const DEFAULT_ROUTINE_MODULES = ['prayer', 'reading', 'reflection']

export async function getRoutineModules(_email) {
  const row = await fetchRow()
  return row?.routine_modules ?? DEFAULT_ROUTINE_MODULES
}

// Substitui a lista inteira (não é edição incremental — sempre manda o
// array completo já com o passo ligado/desligado, decidido em quem chama).
export async function setRoutineModules(_email, modules) {
  const updated = await updateRow({ routine_modules: modules })
  return updated?.routine_modules ?? modules
}
