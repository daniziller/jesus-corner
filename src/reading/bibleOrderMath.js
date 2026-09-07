// Parte pura de bibleOrderStore.js (sem I/O) — em que ordem os 66 livros da
// leitura contínua da Bíblia são percorridos: canônica, cronológica ou
// "minha ordem" (HANDOFF-35-meu-plano.md, 35i). Testável com `node` puro —
// ver scripts/test-bible-order.mjs.
//
// Importante: trocar de ordem NUNCA reseta progresso — o completedSet
// (livro:capítulo) é o mesmo de sempre, só a ORDEM em que se varre os
// livros pra achar "o próximo capítulo que falta" muda. Mesmo princípio que
// deriveChronoProgress (src/data/chronologicalPlan.js) já usa hoje pro
// cronológico como plano alternativo — aqui generalizamos pras 3 ordens,
// pra 35i poder trocar sem duplicar progresso nenhum.
import { BIBLE_BLOCKS } from '../data/bibleBlocks.js'
import { CHRONOLOGICAL_MOVEMENTS } from '../data/chronologicalPlan.js'

export const BIBLE_ORDER_MODES = ['canonical', 'chronological', 'custom']

let _canonical = null
export function canonicalBookOrder() {
  if (_canonical) return _canonical
  _canonical = BIBLE_BLOCKS.flatMap(b => b.books)
  return _canonical
}

let _chronological = null
export function chronologicalBookOrder() {
  if (_chronological) return _chronological
  _chronological = CHRONOLOGICAL_MOVEMENTS.flatMap(m => m.books)
  return _chronological
}

// `customOrder` salvo (lista de nomes de livro) pode estar incompleto (livro
// novo, ou nunca configurado) — qualquer livro canônico que falte nela entra
// no fim, na ordem canônica, pra nunca "sumir" um livro da fila.
export function resolveBookOrder(mode, customOrder) {
  if (mode === 'chronological') return chronologicalBookOrder()
  if (mode === 'custom' && Array.isArray(customOrder) && customOrder.length > 0) {
    const canonical = canonicalBookOrder()
    const known = new Set(canonical)
    const chosen = customOrder.filter(b => known.has(b))
    const missing = canonical.filter(b => !chosen.includes(b))
    return [...chosen, ...missing]
  }
  return canonicalBookOrder()
}

// Primeiro capítulo que falta, varrendo `bookOrder` na sequência — devolve
// null quando a Bíblia inteira já foi lida nessa ordem (todo livro, todo
// capítulo, em completedSet).
export function resolveNextChapter(completedSet, bookOrder, bookChapterCounts) {
  for (const book of bookOrder) {
    const total = bookChapterCounts[book]
    if (!total) continue
    for (let ch = 1; ch <= total; ch++) {
      if (!completedSet.has(`${book}:${ch}`)) return { book, chapter: ch }
    }
  }
  return null
}
