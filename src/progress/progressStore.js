// Progresso de leitura por usuário — guardado no backend (tabela user_data,
// coluna completed_keys), não mais no localStorage. Guardar por CAPÍTULO —
// não por id de sessão — é o que permite trocar de plano (Leve/Padrão/
// Intensivo) sem perder o que já foi lido, já que os ids de sessão mudam de
// tamanho conforme o plano.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getCompletedSet(_email) {
  const row = await fetchRow()
  return new Set(row?.completed_keys ?? [])
}

// Marca todas as chaves informadas (capítulos de uma sessão, ou a chave de
// reflexão de um livro) como concluídas.
export function markKeysDone(_email, keys) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const set = new Set(row?.completed_keys ?? [])
    keys.forEach(k => set.add(k))
    const updated = await updateRow({ completed_keys: [...set] })
    return new Set(updated?.completed_keys ?? set)
  })
}

export function markKeysUndone(_email, keys) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const set = new Set(row?.completed_keys ?? [])
    keys.forEach(k => set.delete(k))
    const updated = await updateRow({ completed_keys: [...set] })
    return new Set(updated?.completed_keys ?? set)
  })
}
