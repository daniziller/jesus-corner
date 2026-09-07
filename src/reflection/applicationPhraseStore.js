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
import { getNotes, saveNote, noteTextOf, noteSessionTitleOf, noteReminderRequestedOf, parseNoteKey } from '../notes/notesStore'
import { dateKey } from '../utils/dateKey'
import { mondayOf } from '../routine/routineStreak'
import { countWeekApplications } from './applicationPhraseMath'

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

// A frase fixada + de qual dia do histórico ela veio, pro cartão "SUA
// APLICAÇÃO DE ONTEM" da Home (34a) — precisa da CHAVE de origem
// (application:{data}) pra marcar "cumpri" na entrada certa, não só do
// texto. A frase fixada em si não guarda essa referência (ver comentário
// em ApplicationPhrasesScreen.jsx/syncPinnedIfMatches) — acha a entrada
// diária mais recente com o MESMO texto, mesmo padrão de comparação já
// usado ali, em vez de duplicar outra convenção.
export async function getPinnedApplicationEntry(email) {
  const notes = await getNotes(email)
  const pinnedText = noteTextOf(notes[PINNED_APPLICATION_KEY])
  if (!pinnedText) return null
  let best = null
  for (const [key, entry] of Object.entries(notes)) {
    const parsed = parseNoteKey(key)
    if (parsed.type !== 'application-phrase') continue
    if (noteTextOf(entry) !== pinnedText) continue
    if (!best || parsed.date > best.date) best = { key, date: parsed.date, entry }
  }
  return {
    text: pinnedText,
    key: best?.key ?? null,
    date: best?.date ?? null,
    sessionTitle: best?.entry ? noteSessionTitleOf(best.entry) : null,
    reminderRequested: best?.entry ? noteReminderRequestedOf(best.entry) : false,
    fulfilled: !!(best?.entry && typeof best.entry === 'object' && best.entry.fulfilled),
  }
}

// "Cumpri" (34a) — marca a entrada de ORIGEM da frase fixada (não a
// fixada em si, que é só uma cópia) como cumprida, preservando os campos
// que já existiam nela (sessionTitle/reminderRequested — saveNote troca o
// objeto `extra` inteiro, nunca faz merge raso, então omitir um campo
// aqui apagaria de verdade uma preferência real, ex: "me lembrar às
// 18h" já marcada). Idempotente.
export async function markPinnedApplicationFulfilled(email, entry) {
  if (!entry?.key || !entry?.text) return
  await saveNote(email, entry.key, entry.text, {
    sessionTitle: entry.sessionTitle ?? null,
    reminderRequested: !!entry.reminderRequested,
    fulfilled: true,
  })
}

// "{N} de {N} cumprida(s) nesta semana" (34a) — quantas frases de
// aplicação esta semana (segunda até hoje) existem no histórico, e
// quantas foram marcadas cumpridas. Mesma convenção de semana de
// mondayOf/isDayGoalMet (routine/routineStreak.js) — reusada de propósito
// (ver comentário lá: "pra applicationPhraseMath.js usar a MESMA
// convenção de semana").
export async function getWeekApplicationStatus(email, today = new Date()) {
  const notes = await getNotes(email)
  const entries = Object.entries(notes)
    .map(([key, entry]) => ({ ...parseNoteKey(key), fulfilled: typeof entry === 'object' && !!entry.fulfilled, hasText: !!noteTextOf(entry) }))
    .filter(e => e.type === 'application-phrase' && e.hasText)
  return countWeekApplications(entries, dateKey(mondayOf(today)), dateKey(today))
}

