// Sequência de dias seguidos usando o app, por usuário — guardada no backend
// (tabela user_data, colunas streak / last_login_at).
import { fetchRow, updateRow } from '../backend/userDataStore'

const HOUR = 60 * 60 * 1000

// Sequência salva atualmente, sem registrar um novo acesso (só leitura).
export async function getStreak(_email) {
  const row = await fetchRow()
  return row?.streak ?? 0
}

// Registra um acesso agora e devolve a sequência de dias seguidos resultante.
// - Primeiro acesso de sempre: começa em 1.
// - Acesso no mesmo dia do último registrado: não muda nada.
// - Acesso em outro dia, dentro de 24h do último acesso: soma +1.
// - Acesso depois de 24h sem nenhum outro: volta pra 1 (reinicia a contagem).
export async function recordAccess(_email, now = Date.now()) {
  const row = await fetchRow()
  if (!row) return 0

  if (!row.last_login_at) {
    const updated = await updateRow({ streak: 1, last_login_at: new Date(now).toISOString() })
    return updated?.streak ?? 1
  }

  const lastLoginAt = new Date(row.last_login_at).getTime()
  const sameDay = new Date(now).toDateString() === new Date(lastLoginAt).toDateString()
  if (sameDay) return row.streak

  const hoursSinceLastAccess = (now - lastLoginAt) / HOUR
  const streak = hoursSinceLastAccess < 24 ? row.streak + 1 : 1
  const updated = await updateRow({ streak, last_login_at: new Date(now).toISOString() })
  return updated?.streak ?? streak
}
