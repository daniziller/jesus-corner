// reiniciarStore.js — grava o "Reiniciar a leitura do zero": a linha de
// user_data (ver restartPatch em reiniciarMath.js) e, se a pessoa pediu, o
// registro das datas de leitura (chapters_read). Devolve a linha gravada.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { deleteRows } from '../backend/guestTableStore'
import { restartPatch } from './reiniciarMath'

export function restartReading(extras) {
  return withRowLock(async () => {
    const updated = await updateRow(restartPatch(await fetchRow(), extras))
    if (extras.dates) await deleteRows('chapters_read')
    return updated
  })
}
