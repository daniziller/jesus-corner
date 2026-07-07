// Progresso dos Estudos — guarda no backend (tabela user_data, coluna
// studies_completed) quais sessões de estudo já foram concluídas.
import { fetchRow, updateRow } from '../backend/userDataStore'

function studySessionKey(studyId, sessionId) {
  return `${studyId}:${sessionId}`
}

export async function getCompletedStudySessions(_email) {
  const row = await fetchRow()
  return new Set(row?.studies_completed ?? [])
}

export async function setStudySessionDone(_email, studyId, sessionId, done) {
  const row = await fetchRow()
  const set = new Set(row?.studies_completed ?? [])
  const key = studySessionKey(studyId, sessionId)
  if (done) set.add(key)
  else set.delete(key)
  const updated = await updateRow({ studies_completed: [...set] })
  return new Set(updated?.studies_completed ?? set)
}

// Opera sobre um Set já carregado — continua síncrona (não faz I/O).
export function isStudySessionDone(completedSet, studyId, sessionId) {
  return completedSet.has(studySessionKey(studyId, sessionId))
}
