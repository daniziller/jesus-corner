// Anotações pessoais por passagem — guardadas no backend (tabela user_data,
// coluna notes, um objeto { chave: texto }). A chave é a passagem/reflexão em
// si (não um id de sessão) para sobreviver a trocas de plano, já que os ids
// de sessão mudam de tamanho conforme o plano escolhido.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

// Chave estável de uma sessão: os capítulos exatos (ou a reflexão) que ela
// cobre, independente de qual plano gerou essa sessão.
export function noteKeyFor(session) {
  return session.type === 'reflection'
    ? `${session.book}:reflection`
    : `${session.book}:${session.chStart}-${session.chEnd}`
}

export async function getNotes(_email) {
  const row = await fetchRow()
  return row?.notes ?? {}
}

export async function getNote(_email, key) {
  const notes = await getNotes(_email)
  return notes[key] ?? ''
}

export function saveNote(_email, key, text) {
  return withRowLock(async () => {
    const notes = await getNotes(_email)
    if (text.trim()) notes[key] = text
    else delete notes[key]
    const updated = await updateRow({ notes })
    return updated?.notes ?? notes
  })
}
