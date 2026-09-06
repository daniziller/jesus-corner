// Parte pura de applicationPhraseStore.js (sem I/O) — conta quantas
// aplicações da semana atual (segunda a domingo, mesma convenção de
// mondayOf() em routineStreak.js) foram escritas e quantas foram marcadas
// "Cumpri" (quadros 29a/30a). Recebe o mapa de notas inteiro (getNotes())
// porque cada dia é uma chave própria (application:{data}) — sem tabela
// nova, "cumpri" é só mais um campo salvo na mesma entrada (ver
// setApplicationFulfilled em applicationPhraseStore.js).
import { dateKey } from '../utils/dateKey.js'
import { mondayOf } from '../routine/routineStreak.js'

// Cópia mínima de noteTextOf (notesStore.js) — não importa de lá de
// propósito: notesStore.js puxa a cadeia de I/O do Supabase (fetchRow/
// updateRow), o que impediria testar este arquivo com `node` puro (ver
// scripts/test-application-phrase.mjs). A regra em si (entrada pode ser
// string solta, de antes do formato {text,updatedAt}, ou o objeto novo) é
// pequena o bastante pra duplicar sem risco de as duas cópias divergirem.
function noteTextOf(entry) {
  if (entry == null) return ''
  return typeof entry === 'string' ? entry : entry.text ?? ''
}

// { written, fulfilled } — written = dias desta semana (até hoje) com frase
// de aplicação salva; fulfilled = quantos desses foram marcados "Cumpri".
// "de 4" no design é o denominador de exemplo da persona (4 dias marcados
// naquela semana); aqui o denominador real e mais honesto é o que foi de
// fato escrito, não a meta — dias sem reflexão não contam pra nenhum lado.
export function weeklyApplicationStats(notes, today = new Date()) {
  const monday = mondayOf(today)
  let written = 0
  let fulfilled = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const entry = notes[`application:${dateKey(d)}`]
    if (!noteTextOf(entry)) continue
    written++
    if (entry?.fulfilled) fulfilled++
  }
  return { written, fulfilled }
}
