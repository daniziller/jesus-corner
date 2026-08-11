// Plano ativo "alternativo" (por tema ou cronológico) por usuário —
// guardado no backend (tabela user_data, coluna active_alt_plan). null
// significa "sem alternativo", ou seja, o plano ativo é o fixo de sempre
// (ver src/plan/planStore.js) — ver migration 0031_active_alt_plan.sql.
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getActiveAltPlan(_email) {
  const row = await fetchRow()
  return row?.active_alt_plan ?? null
}

export async function setActiveAltPlan(_email, altPlan) {
  await updateRow({ active_alt_plan: altPlan })
}
