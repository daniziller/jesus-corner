// Plano de leitura escolhido (Leve/Padrão/Intensivo) por usuário — guardado
// no backend (tabela user_data, coluna plan_id).
import { fetchRow, updateRow } from '../backend/userDataStore'

const DEFAULT_PLAN_ID = 'standard'

export async function getSelectedPlanId(_email) {
  const row = await fetchRow()
  return row?.plan_id || DEFAULT_PLAN_ID
}

export async function setSelectedPlanId(_email, planId) {
  await updateRow({ plan_id: planId })
}
