// Tempo de leitura acumulado (segundos) — "horas de leitura acumulada" do
// painel do Início (quadro 12a, ver HomeDashboard.jsx). O leitor imersivo
// soma o tempo em que o texto está aberto com a aba visível
// (useReadingTimer em ReadingBlockView.jsx) e descarrega aqui em lotes.
// Vive na linha de dados da pessoa (user_data.reading_seconds, migration
// 0044) — no modo convidado, na linha local (ver userDataStore.js).
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getReadingSeconds() {
  const row = await fetchRow()
  return row?.reading_seconds ?? 0
}

export function addReadingSeconds(seconds) {
  const n = Math.max(0, Math.round(seconds))
  if (!n) return Promise.resolve(null)
  return withRowLock(async () => {
    const row = await fetchRow()
    const next = (row?.reading_seconds ?? 0) + n
    const updated = await updateRow({ reading_seconds: next })
    return updated?.reading_seconds ?? next
  })
}
