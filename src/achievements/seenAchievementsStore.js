// Quais conquistas a pessoa já "viu" na Home (por dispositivo, localStorage)
// — serve só pra destacar as recém-desbloqueadas com um selo "Nova!" até a
// próxima visita. Não é progresso de verdade (isso vem de
// computeUnlockedAchievements); é só memória de UI.
const KEY = 'jc_seen_achievements'

export function getSeenAchievements() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? new Set(v) : new Set()
  } catch {
    return new Set()
  }
}

export function markAchievementsSeen(ids) {
  if (!ids || ids.length === 0) return
  try {
    const next = getSeenAchievements()
    ids.forEach(id => next.add(id))
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch { /* cota cheia / indisponível — só não destaca, sem quebrar */ }
}
