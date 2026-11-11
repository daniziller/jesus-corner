// evaluate.js — a avaliação das conquistas (HANDOFF §7): junta as fontes
// (completed_keys, chapters_read, session_seconds, group_prayer_intentions,
// daily_routine, weekly_goal_history), calcula o que a pessoa tem
// (familiesMath/bibleProgressMath, puros), funde com o que já está gravado
// (achievementsMath, puro, idempotente) e grava. Única camada com I/O da
// gamificação além das stores.
//
// Quando roda: ao concluir uma sessão (oração, leitura ou reflexão) e ao
// marcar capítulo como lido fora do plano (App.jsx) — e, uma vez só, na
// primeira abertura depois da atualização (migração retroativa
// silenciosa: tudo gravado como ganho e JÁ VISTO, sem fila de parabéns;
// `gamification_migrated_at` marca que já rodou). Nunca remove nada.
import { computeBibleProgress } from './bibleProgressMath.js'
import { computeFamilyStates } from './familiesMath.js'
import { computeEarnedAchievements, mergeAchievementStore, mergeBookSeals, pickCelebration, markSeen } from './achievementsMath.js'
import { firstActivityIso } from './projectionMath.js'
import { getGamificationRow, updateGamification } from './achievementsStore.js'
import { getAllChapterReadRows } from '../bible/chapterReadLog.js'
import { getAllSessions } from '../metrics/sessionDurationStore.js'
import { getMyPrayerIntentions, getMyPrayerRequestIds } from '../groups/prayerRequestsStore.js'

async function settled(promise, fallback) {
  try { return await promise } catch (err) { console.error('[gamificação] fonte indisponível', err); return fallback }
}

// Carrega as fontes e calcula o estado atual — sem gravar nada. Base de
// G5/G6/G4/G9 e da avaliação abaixo.
export async function loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays, today = new Date() }) {
  const [chapterRows, sessionRows, intentionRows, myRequestIds, row] = await Promise.all([
    settled(getAllChapterReadRows(), []),
    settled(getAllSessions(), []),
    settled(getMyPrayerIntentions(), []),
    settled(getMyPrayerRequestIds(), new Set()),
    getGamificationRow(),
  ])
  const progress = computeBibleProgress(completedSet)
  const stats = { progress, completedSet, chapterRows, sessionRows, intentionRows, myRequestIds, dailyRoutine, goalHistory: row.goalHistory, weeklyGoalDays, today }
  const states = computeFamilyStates(stats)
  return { stats, progress, states, row, firstActivityIso: firstActivityIso(chapterRows, sessionRows, dailyRoutine) }
}

// Avalia e grava. Devolve o que entrou de novo e o que celebrar (uma
// coisa só, pela prioridade de §7), além do estado pras telas.
// `silent` força "já visto" (migração); sem a marca de migração na conta,
// a chamada é silenciosa de qualquer jeito.
export async function evaluateGamification({ completedSet, dailyRoutine, weeklyGoalDays, silent = false }) {
  const loaded = await loadGamificationStats({ completedSet, dailyRoutine, weeklyGoalDays })
  const now = new Date().toISOString()
  const migrating = !loaded.row.migratedAt
  const seen = silent || migrating
  const earned = computeEarnedAchievements(loaded.states)
  let result = { newIds: [], newBooks: [] }
  const row = await updateGamification(current => {
    const a = mergeAchievementStore(current.achievements, earned, { now, seen })
    const b = mergeBookSeals(current.bookSeals, loaded.progress, loaded.states.completionDates, { now })
    result = { newIds: a.newIds, newBooks: b.newBooks }
    if (a.newIds.length === 0 && b.newBooks.length === 0 && !migrating) return null
    return { achievements: a.store, bookSeals: b.seals, migratedAt: migrating ? now : null }
  })
  const celebration = seen ? null : pickCelebration(result.newBooks, result.newIds)
  return { ...loaded, row, ...result, celebration }
}

// Marca conquistas como vistas (ao abrir G5) e devolve a linha atualizada.
export function markAchievementsSeen(ids) {
  if (!ids || ids.length === 0) return getGamificationRow()
  return updateGamification(current => ({ achievements: markSeen(current.achievements, ids) }))
}
