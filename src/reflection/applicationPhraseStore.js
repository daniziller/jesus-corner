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
import { getNotes, saveNote, noteTextOf } from '../notes/notesStore'
import { dateKey } from '../utils/dateKey'

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
