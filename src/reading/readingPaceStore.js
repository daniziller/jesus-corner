// Ritmo aprendido de leitura — log de sessões (reading_pace_sessions) e o
// interruptor "Montar os blocos pelo meu ritmo" (use_learned_pace),
// migration 0058. Mesmo padrão fino das outras stores sobre fetchRow/
// updateRow; a conta pura (mediana móvel, cold start) vive em
// readingPaceMath.js — ver HANDOFF-35-meu-plano.md, "Ritmo aprendido".
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'
import { pushPaceSession } from './readingPaceMath'

export async function getReadingPaceSessions() {
  const row = await fetchRow()
  return Array.isArray(row?.reading_pace_sessions) ? row.reading_pace_sessions : []
}

// `sample`: { wordsPerMinute, activeSeconds, at } — gravado pelo relógio de
// leitura (Bloco 3, 35f) ao fim de cada sessão. Devolve o log já atualizado.
export function addReadingPaceSession(sample) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const next = pushPaceSession(row?.reading_pace_sessions, sample)
    const updated = await updateRow({ reading_pace_sessions: next })
    return Array.isArray(updated?.reading_pace_sessions) ? updated.reading_pace_sessions : next
  })
}

export async function getUseLearnedPace() {
  const row = await fetchRow()
  return !!row?.use_learned_pace
}

export async function setUseLearnedPace(on) {
  await updateRow({ use_learned_pace: !!on })
}
