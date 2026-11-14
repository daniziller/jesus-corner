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

export { parseNoteKey, noteTextOf, noteUpdatedAtOf, noteSessionTitleOf, noteReminderRequestedOf } from './noteKeys.js'

export async function getNotes(_email) {
  const row = await fetchRow()
  return row?.notes ?? {}
}

// extra — campos opcionais além de text/updatedAt (hoje só sessionTitle,
// usado pela frase de aplicação — ver noteSessionTitleOf acima).
export function saveNote(_email, key, text, extra = {}) {
  return withRowLock(async () => {
    const notes = await getNotes(_email)
    // Preserva campos já gravados na entrada (fulfilled/sessionTitle da
    // frase de aplicação) — editar o texto na Biblioteca apagava o
    // "Cumpri" da semana e do recap do mês (varredura 2026-10-25).
    if (text.trim()) notes[key] = { ...(notes[key] ?? {}), text, updatedAt: new Date().toISOString(), ...extra }
    else delete notes[key]
    const updated = await updateRow({ notes })
    return updated?.notes ?? notes
  })
}
