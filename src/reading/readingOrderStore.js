// Ordem de leitura escolhida (AT primeiro, padrão, ou NT primeiro) por
// usuário — guardado no backend (tabela user_data, coluna reading_order).
// Mesmo padrão de src/plan/planStore.js.
import { fetchRow, updateRow } from '../backend/userDataStore'

const DEFAULT_READING_ORDER = 'ot_first'

export async function getReadingOrder(_email) {
  const row = await fetchRow()
  return row?.reading_order || DEFAULT_READING_ORDER
}

export async function setReadingOrder(_email, order) {
  await updateRow({ reading_order: order })
}
