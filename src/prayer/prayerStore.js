// Pedidos de oração por usuário — guardados no backend (tabela user_data,
// coluna prayer_requests, um array de objetos).
import { fetchRow, updateRow } from '../backend/userDataStore'

export async function getRequests(_email) {
  const row = await fetchRow()
  return Array.isArray(row?.prayer_requests) ? row.prayer_requests : []
}

export async function saveRequests(_email, requests) {
  await updateRow({ prayer_requests: requests })
}
