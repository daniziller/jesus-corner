// Rotina diária (Oração, Leitura, Reflexão) — um mapa data → passos
// concluídos, guardado em user_data.daily_routine. Mesmo padrão "lê o blob
// inteiro, escreve o blob inteiro de volta" das outras stores desse
// backend (ver src/backend/userDataStore.js).
import { fetchRow, updateRow } from '../backend/userDataStore'
import { dateKey } from '../utils/dateKey'

export async function getDailyRoutine() {
  const row = await fetchRow()
  return row?.daily_routine ?? {}
}

// Marca (ou desmarca) um passo de HOJE ('prayer' | 'reading' | 'reflection')
// como concluído. Devolve o mapa inteiro já atualizado, pra quem chamou
// poder atualizar o estado local sem precisar de um novo fetch.
export async function setStepDone(step, done = true) {
  const row = await fetchRow()
  const current = row?.daily_routine ?? {}
  const key = dateKey()
  const today = { ...current[key] }
  if (done) today[step] = true
  else delete today[step]
  const next = { ...current, [key]: today }
  const updated = await updateRow({ daily_routine: next })
  return updated?.daily_routine ?? next
}
