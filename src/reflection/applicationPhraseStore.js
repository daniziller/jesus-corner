// Frase de aplicação da Reflexão diária (passo "Aplicar") — duas coisas
// diferentes guardadas no mesmo notesStore.js (tabela user_data, coluna
// notes), com chaves distintas:
//
// - application:{dateKey} — uma por dia, o HISTÓRICO (aparece em
//   NotesScreen.jsx junto com as outras anotações).
// - application:pinned — a ÚNICA frase "fixada" pro card da Home
//   (HomeScreen.jsx). Só muda quando a pessoa escreve uma frase nova E
//   confirma que quer trocar (ver ReflectionScreen.jsx) — a primeira frase
//   de todas fixa sozinha, sem perguntar, já que não tem o que comparar.
import { getNotes, saveNote, noteTextOf, noteSessionTitleOf } from '../notes/notesStore'
import { dateKey } from '../utils/dateKey'
import { weeklyApplicationStats } from './applicationPhraseMath'

export { weeklyApplicationStats } from './applicationPhraseMath'

export const PINNED_APPLICATION_KEY = 'application:pinned'

export function dailyApplicationKeyFor(date = new Date()) {
  return `application:${dateKey(date)}`
}

export async function getPinnedApplicationPhrase(email) {
  const notes = await getNotes(email)
  return noteTextOf(notes[PINNED_APPLICATION_KEY])
}

export function setPinnedApplicationPhrase(email, text) {
  return saveNote(email, PINNED_APPLICATION_KEY, text)
}

// "Cumpri" (29a/30a) — marca a frase de aplicação de UM DIA específico
// (application:{data}, não a fixada) como cumprida ou não. É um toque, não
// vira métrica pública: o número só aparece pra quem escreveu, no Início
// (ver applicationPhraseMath.js/weeklyApplicationStats). Não faz nada se
// aquele dia não tem frase salva — não tem o que marcar.
export async function setApplicationFulfilled(email, dateStr, fulfilled) {
  const key = dailyApplicationKeyFor(new Date(`${dateStr}T00:00:00`))
  const notes = await getNotes(email)
  const entry = notes[key]
  const text = noteTextOf(entry)
  if (!text) return
  await saveNote(email, key, text, { sessionTitle: noteSessionTitleOf(entry), fulfilled })
}

// Frase + estado de UM dia específico (usada pelo card "Sua aplicação de
// ontem" — ver HomeDashboard.jsx). null quando não há frase salva naquele
// dia (a Home some com o cartão inteiro nesse caso).
export async function getApplicationPhraseForDate(email, dateStr) {
  const notes = await getNotes(email)
  const key = dailyApplicationKeyFor(new Date(`${dateStr}T00:00:00`))
  const entry = notes[key]
  const text = noteTextOf(entry)
  if (!text) return null
  return { text, fulfilled: !!entry?.fulfilled, stats: weeklyApplicationStats(notes) }
}
