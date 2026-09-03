// Quais conquistas a pessoa já "viu" (por dispositivo, localStorage) — usado
// pela folha de celebração da aba Progresso (redesign 1f/etapa 5): uma
// conquista some da grade permanente e vira uma folha que aparece só na hora
// em que é desbloqueada (ver AchievementCelebration.jsx/App.jsx). Não é
// progresso de verdade (isso vem de computeUnlockedAchievements); é só
// memória de UI de quais já foram "comemoradas".
const KEY = 'jc_seen_achievements'
// Marca se este dispositivo já foi inicializado (ver `ensureSeeded` abaixo)
// — sem isso, não dá pra distinguir "conta nova, zero conquistas ainda" de
// "conta antiga com várias conquistas, mas a folha de celebração é nova" só
// olhando pro tamanho do Set (os dois começam vazios/tamanho 0).
const INIT_KEY = 'jc_seen_achievements_init'

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

// Roda uma única vez por dispositivo (marcada por INIT_KEY): se é a
// primeira vez que este mecanismo existe aqui e a conta JÁ tem conquistas
// desbloqueadas (grandfathering de contas de antes da folha de celebração
// existir), marca todas como vistas de uma vez — sem isso, a pessoa veria
// uma fila de folhas de celebração entupindo a primeira visita. Contas
// novas (sem nenhuma desbloqueada ainda) só marcam a inicialização, sem
// esconder a celebração da primeira conquista de verdade.
export function ensureSeeded(currentUnlockedIds) {
  try {
    if (localStorage.getItem(INIT_KEY)) return
    markAchievementsSeen(currentUnlockedIds)
    localStorage.setItem(INIT_KEY, '1')
  } catch { /* indisponível — segue sem seed, pior caso é 1 fila de folhas */ }
}
