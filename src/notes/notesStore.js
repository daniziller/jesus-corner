// Anotações pessoais por passagem — guardadas no backend (tabela user_data,
// coluna notes, um objeto { chave: entrada }). A chave é a passagem/reflexão em
// si (não um id de sessão) para sobreviver a trocas de plano, já que os ids
// de sessão mudam de tamanho conforme o plano escolhido.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

// Chave estável de uma sessão de LEITURA: os capítulos exatos (ou a
// reflexão de fechamento de livro) que ela cobre, independente de qual
// plano gerou essa sessão. Anotação diária da aba Reflexão usa outro
// esquema de chave, montado direto em ReflectionScreen.jsx (`reflection:
// {dateKey}` — sem livro, é por dia, não por passagem).
export function noteKeyFor(session) {
  return session.type === 'reflection'
    ? `${session.book}:reflection`
    : `${session.book}:${session.chStart}-${session.chEnd}`
}

// Desmonta uma chave de volta no que ela representa — usado só por
// NotesScreen.jsx (histórico de todas as anotações) pra saber como rotular
// e agrupar cada uma, sem duplicar o conhecimento do formato da chave.
// application:pinned nunca deve aparecer no histórico — não é uma entrada
// por dia, é só o valor "fixado" no card da Home (ver
// reflection/applicationPhraseStore.js); por isso o type 'unknown', o
// mesmo que NotesScreen.jsx já filtra pra fora da lista.
export function parseNoteKey(key) {
  if (key === 'application:pinned') return { type: 'unknown' }
  const dailyApplication = key.match(/^application:(\d{4}-\d{2}-\d{2})$/)
  if (dailyApplication) return { type: 'application-phrase', date: dailyApplication[1] }
  const daily = key.match(/^reflection:(\d{4}-\d{2}-\d{2})$/)
  if (daily) return { type: 'daily-reflection', date: daily[1] }
  // Retrospectiva do mês guardada na Biblioteca (quadro 17b).
  const recap = key.match(/^recap:(\d{4}-\d{2})$/)
  if (recap) return { type: 'recap', month: recap[1] }
  const bookReflection = key.match(/^(.+):reflection$/)
  if (bookReflection) return { type: 'book-reflection', book: bookReflection[1] }
  const reading = key.match(/^(.+):(\d+)-(\d+)$/)
  if (reading) return { type: 'reading', book: reading[1], chStart: Number(reading[2]), chEnd: Number(reading[3]) }
  return { type: 'unknown' }
}

// Entradas guardadas antes desta versão eram string pura (só o texto); a
// partir de agora viram { text, updatedAt } pra dar pra ordenar o histórico
// por data (ver NotesScreen.jsx). Essas duas funções aceitam os dois
// formatos na leitura, então notas antigas continuam funcionando.
export function noteTextOf(entry) {
  if (entry == null) return ''
  return typeof entry === 'string' ? entry : entry.text ?? ''
}
export function noteUpdatedAtOf(entry) {
  return (typeof entry === 'object' && entry?.updatedAt) || null
}
// Só a frase de aplicação usa isso — o título da sessão de leitura do dia
// em que ela foi escrita, gravado junto na hora (ver ReflectionScreen.jsx),
// pra ApplicationPhrasesScreen.jsx conseguir mostrar "escrita lendo X" sem
// precisar tentar reconstruir isso depois a partir só da data.
export function noteSessionTitleOf(entry) {
  return (typeof entry === 'object' && entry?.sessionTitle) || null
}

export async function getNotes(_email) {
  const row = await fetchRow()
  return row?.notes ?? {}
}

export async function getNote(_email, key) {
  const notes = await getNotes(_email)
  return noteTextOf(notes[key])
}

// extra — campos opcionais além de text/updatedAt (hoje só sessionTitle,
// usado pela frase de aplicação — ver noteSessionTitleOf acima).
export function saveNote(_email, key, text, extra = {}) {
  return withRowLock(async () => {
    const notes = await getNotes(_email)
    if (text.trim()) notes[key] = { text, updatedAt: new Date().toISOString(), ...extra }
    else delete notes[key]
    const updated = await updateRow({ notes })
    return updated?.notes ?? notes
  })
}
