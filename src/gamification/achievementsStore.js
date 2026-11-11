// achievementsStore.js — persistência da gamificação (migration 0075):
// user_data.achievements (conquistas ganhas), user_data.book_seals (selos
// de livro e releituras) e user_data.weekly_goal_history (meta semanal
// vigente por semana). Wrappers finos sobre fetchRow/updateRow/withRowLock
// (src/backend/userDataStore.js) — mesmo padrão das outras stores, então
// funcionam pra convidado sem mudança (a linha local tem o mesmo formato).
// Toda a lógica (o que entra, quando) é pura e vive em achievementsMath.js.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getGamificationRow() {
  const row = await fetchRow()
  return {
    achievements: row?.achievements ?? {},
    bookSeals: row?.book_seals ?? {},
    goalHistory: Array.isArray(row?.weekly_goal_history) ? row.weekly_goal_history : [],
    migratedAt: row?.gamification_migrated_at ?? null,
  }
}

// Grava conquistas e selos já fundidos (mergeAchievementStore/
// mergeBookSeals). Chamado só com o resultado de uma fusão sobre a linha
// lida dentro do mesmo lock — nunca sobrescreve uma conquista existente.
export function saveGamification({ achievements, bookSeals }) {
  return withRowLock(async () => {
    const patch = {}
    if (achievements) patch.achievements = achievements
    if (bookSeals) patch.book_seals = bookSeals
    const updated = await updateRow(patch)
    return { achievements: updated?.achievements ?? achievements, bookSeals: updated?.book_seals ?? bookSeals }
  })
}

// Lê, aplica `mutate(row)` (pura, devolve { achievements?, bookSeals? })
// e grava, tudo dentro do lock — pra duas avaliações seguidas (fim de
// sessão + capítulo marcado) nunca partirem da mesma linha antiga.
export function updateGamification(mutate) {
  return withRowLock(async () => {
    const current = await getGamificationRow()
    const next = mutate(current)
    if (!next) return current
    const patch = {}
    if (next.achievements) patch.achievements = next.achievements
    if (next.bookSeals) patch.book_seals = next.bookSeals
    if (next.migratedAt) patch.gamification_migrated_at = next.migratedAt
    if (Object.keys(patch).length === 0) return current
    const updated = await updateRow(patch)
    return {
      ...current,
      achievements: updated?.achievements ?? next.achievements ?? current.achievements,
      bookSeals: updated?.book_seals ?? next.bookSeals ?? current.bookSeals,
      migratedAt: updated?.gamification_migrated_at ?? next.migratedAt ?? current.migratedAt,
    }
  })
}
