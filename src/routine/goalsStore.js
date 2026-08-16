// Metas de constância já concluídas (ver goals.js pros critérios) —
// guardadas no backend (tabela user_data, coluna completed_goals, um
// objeto { [goalId]: { completedAt } }). Mesmo padrão de
// prayerStatsStore.js/dailyRoutineStore.js: fetchRow/updateRow/withRowLock
// de userDataStore.js.
import { fetchRow, updateRow, withRowLock } from '../backend/userDataStore'

export async function getCompletedGoals() {
  const row = await fetchRow()
  return row?.completed_goals ?? {}
}

// Grava uma meta como concluída, pra sempre — chamado só quando App.jsx
// detecta que uma meta que ainda não estava em completedGoals passou a
// qualificar (ver useEffect em App.jsx). O check de `current[goalId]` evita
// gravar duas vezes se a função for chamada mais de uma vez pra mesma meta
// (ex: dois renders seguidos antes do estado local atualizar).
export function recordCompletedGoal(goalId) {
  return withRowLock(async () => {
    const row = await fetchRow()
    const current = row?.completed_goals ?? {}
    if (current[goalId]) return current
    const next = { ...current, [goalId]: { completedAt: new Date().toISOString() } }
    const updated = await updateRow({ completed_goals: next })
    return updated?.completed_goals ?? next
  })
}
