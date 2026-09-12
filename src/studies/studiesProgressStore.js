// Progresso dos Estudos — guarda no backend (tabela user_data, coluna
// studies_completed) quais sessões de estudo já foram concluídas.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

function studySessionKey(studyId, sessionId) {
  return `${studyId}:${sessionId}`
}

export async function getCompletedStudySessions(_email) {
  const row = await fetchRow()
  return new Set(row?.studies_completed ?? [])
}

export function setStudySessionDone(_email, studyId, sessionId, done) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const set = new Set(row?.studies_completed ?? [])
    const key = studySessionKey(studyId, sessionId)
    if (done) set.add(key)
    else set.delete(key)
    const updated = await updateRow({ studies_completed: [...set] })
    return new Set(updated?.studies_completed ?? set)
  })
}

// Opera sobre um Set já carregado — continua síncrona (não faz I/O).
export function isStudySessionDone(completedSet, studyId, sessionId) {
  return completedSet.has(studySessionKey(studyId, sessionId))
}

// "Apagar" um Estudo do catálogo pronto na Biblioteca (NotesScreen.jsx) —
// o estudo em si é conteúdo fixo do app, não dá pra apagar; isso só zera
// o progresso (todas as sessões voltam a "não feitas"), o que já é
// suficiente pra ele sumir da Biblioteca (só aparece com doneCount > 0,
// ver studyEntries) — o estudo continua disponível pra começar de novo
// em StudiesScreen.
export function clearStudyProgress(_email, studyId, sessionIds) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const set = new Set(row?.studies_completed ?? [])
    for (const sessionId of sessionIds) set.delete(studySessionKey(studyId, sessionId))
    const updated = await updateRow({ studies_completed: [...set] })
    return new Set(updated?.studies_completed ?? set)
  })
}
