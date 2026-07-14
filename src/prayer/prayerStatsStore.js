// Estatísticas cumulativas da aba Oração — alimentam as conquistas
// relacionadas à oração (ver utils/achievements.js). São contadores que só
// crescem, mesmo que o usuário apague um pedido depois, então a conquista
// desbloqueada continua valendo. Guardadas no backend (tabela user_data,
// coluna prayer_stats).
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

const DEFAULT_STATS = { requestsAdded: 0, requestsAnswered: 0, timerCompletions: 0 }

export async function getPrayerStats(_email) {
  const row = await fetchRow()
  return { ...DEFAULT_STATS, ...(row?.prayer_stats ?? {}) }
}

export function incrementPrayerStat(_email, key) {
  return withRowLock(async () => {
    const stats = await getPrayerStats(_email)
    stats[key] = (stats[key] ?? 0) + 1
    await updateRow({ prayer_stats: stats })
    return stats
  })
}
