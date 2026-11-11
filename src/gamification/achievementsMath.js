// achievementsMath.js — de "o que a pessoa tem" (familiesMath) pra "o que
// já ganhou" (user_data.achievements) e "o que celebrar agora" (HANDOFF
// §7). Pura, sem I/O. Testes em scripts/test-gamificacao.mjs.
//
// Formato gravado em user_data.achievements (migration 0075):
//   { "<id>": { earnedAt: ISO, seen: bool, dateKnown: bool } }
// Formato de user_data.book_seals:
//   { "<Livro>": { completedAt: ISO, dateKnown: bool, readings: n } }
// Uma entrada, uma vez gravada, NUNCA é removida nem alterada por um
// recálculo — desmarcar capítulo muda a roda, não o que já foi ganho.
import { familyAchievementId, blockAchievementId, FAMILIES } from '../data/achievements.js'

// [{ id, earnedAt }] de tudo que o estado atual justifica — famílias e
// blocos. earnedAt null = data desconhecida.
export function computeEarnedAchievements(states) {
  const out = []
  for (const fam of states.families) {
    for (const d of fam.earned) out.push({ id: familyAchievementId(fam.id, d.degrau), earnedAt: d.earnedAt })
  }
  for (const b of states.blocks) {
    if (b.completo) out.push({ id: blockAchievementId(b.id), earnedAt: b.earnedAt })
  }
  return out
}

// Funde o que foi calculado com o que já está gravado. Idempotente: o que
// já existe não muda; só entradas novas entram. `seen` true = migração
// retroativa silenciosa (sem fila de parabéns); false = conquista nova de
// verdade, a mostrar. Devolve { store, newIds }.
export function mergeAchievementStore(stored, earned, { now, seen }) {
  const store = { ...(stored ?? {}) }
  const newIds = []
  for (const e of earned) {
    if (store[e.id]) continue
    store[e.id] = { earnedAt: e.earnedAt ?? now, seen, dateKnown: !!e.earnedAt }
    newIds.push(e.id)
  }
  return { store, newIds }
}

export function mergeBookSeals(stored, progress, completionDates, { now }) {
  const seals = { ...(stored ?? {}) }
  const newBooks = []
  for (const nome of progress.completos) {
    if (seals[nome]) continue
    const iso = completionDates[nome]
    seals[nome] = { completedAt: iso ?? now, dateKnown: !!iso, readings: 1 }
    newBooks.push(nome)
  }
  return { seals, newBooks }
}

export function markSeen(store, ids) {
  const next = { ...store }
  for (const id of ids) if (next[id]) next[id] = { ...next[id], seen: true }
  return next
}

export function countEarned(store) {
  return Object.keys(store ?? {}).length
}

export function unseenIds(store) {
  return Object.entries(store ?? {}).filter(([, v]) => !v.seen).map(([id]) => id)
}

// Mês mais antigo entre as conquistas com data conhecida — "desde {mês}"
// em G5 usa o primeiro registro de atividade (firstActivityIso), não isto;
// exportado pra G6 ("mês/ano em que ganhou") ler do store.
export function earnedAtOf(store, id) {
  const e = store?.[id]
  return e?.dateKnown ? e.earnedAt : null
}

// "A mais perto" (G5): entre os próximos degraus de todas as famílias, o
// de maior value/limiar; empate → ordem das famílias. Null se tudo
// completo. `progress` (0–1) é o avanço entre o degrau atual e o próximo —
// a barra do cartão "Próxima conquista" do Hoje.
export function pickClosest(families) {
  let best = null
  for (const fam of families) {
    if (!fam.next) continue
    if (!best || fam.ratio > best.ratio) best = { familyId: fam.id, ratio: fam.ratio, ...fam.next, remaining: fam.remaining, progress: fam.progress, unidade: fam.unidade, unidadeSingular: fam.unidadeSingular }
  }
  return best
}

// O que celebrar nesta sessão (uma tela só, HANDOFF §7). Prioridade:
// livro completo (G8) → bloco completo → degrau de família (o de maior
// degrau; empate → ordem das famílias). As demais ficam gravadas e
// aparecem em G5 como novas.
export function pickCelebration(newBooks, newIds) {
  if (newBooks.length > 0) return { kind: 'livro', nome: newBooks[0] }
  const bloco = newIds.find(id => id.startsWith('bloco:'))
  if (bloco) return { kind: 'bloco', id: bloco }
  let best = null
  for (const id of newIds) {
    const [familyId, degrauStr] = id.split(':')
    const degrau = Number(degrauStr)
    const famIndex = FAMILIES.findIndex(f => f.id === familyId)
    if (famIndex === -1) continue
    if (!best || degrau > best.degrau || (degrau === best.degrau && famIndex < best.famIndex)) best = { kind: 'degrau', id, degrau, famIndex }
  }
  return best ? { kind: 'degrau', id: best.id } : null
}

// Releitura (G10, HANDOFF §6.3/§8): "Ler {Livro} de novo" abre um rastro
// de capítulos; cada capítulo do livro lido a partir daí entra no rastro;
// quando todos entram, `readings` sobe (máximo 3 pontos no selo) e o
// rastro fecha. Releitura não mexe em roda, Leitura nem Livros completos.
export const MAX_READINGS = 3

export function startReread(seals, nome, { now }) {
  const seal = seals?.[nome]
  if (!seal) return seals
  return { ...seals, [nome]: { ...seal, reread: { startedAt: now, chapters: [] } } }
}

export function recordRereadChapter(seals, nome, chapter, total) {
  const seal = seals?.[nome]
  if (!seal?.reread) return { seals, completed: false }
  const chapters = seal.reread.chapters.includes(chapter) ? seal.reread.chapters : [...seal.reread.chapters, chapter]
  if (chapters.length >= total) {
    const { reread, ...rest } = seal
    return { seals: { ...seals, [nome]: { ...rest, readings: Math.min(MAX_READINGS, (seal.readings ?? 1) + 1) } }, completed: true }
  }
  return { seals: { ...seals, [nome]: { ...seal, reread: { ...seal.reread, chapters } } }, completed: false }
}
