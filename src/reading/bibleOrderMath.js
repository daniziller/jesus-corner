// Parte pura de bibleOrderStore.js (sem I/O) — em que ordem a leitura
// contínua da Bíblia é percorrida: canônica, cronológica, "minha ordem"
// (a pessoa monta a fila e escolhe quais livros entram) ou "ordem livre"
// (o plano segue de onde a pessoa estiver na leitura do plano) — e de onde
// o plano começa. Testável com `node` puro — ver scripts/test-bible-order.mjs.
//
// Importante: trocar de ordem NUNCA reseta progresso — o completedSet
// (livro:capítulo) é o mesmo de sempre, só a ORDEM em que se varre os
// livros pra achar "o próximo capítulo que falta" muda. Mesmo princípio que
// deriveChronoProgress (src/data/chronologicalPlan.js) já usa hoje pro
// cronológico como plano alternativo — aqui generalizamos pras 4 ordens,
// pra 35i poder trocar sem duplicar progresso nenhum.
//
// O ponto de partida NUNCA marca nada como lido: escolher começar em
// Salmos só gira a fila — o plano segue dali, e o que ficou para trás
// continua por ler, no fim da fila. Só o que é lido de verdade (no plano,
// ou marcado à mão na leitura livre) entra no completedSet.
import { CHRONOLOGICAL_MOVEMENTS } from '../data/chronologicalPlan.js'
import { orderedBibleBlocks } from '../utils/progress.js'

// A ordem da Bíblia — com o Antigo ou o Novo Testamento primeiro (a
// escolha de sempre de `reading_order`).
const _canonical = {}
export function canonicalBookOrder(readingOrder = 'ot_first') {
  const key = readingOrder === 'nt_first' ? 'nt_first' : 'ot_first'
  if (!_canonical[key]) _canonical[key] = orderedBibleBlocks(key).flatMap(b => b.books)
  return _canonical[key]
}

let _chronological = null
export function chronologicalBookOrder() {
  if (_chronological) return _chronological
  _chronological = CHRONOLOGICAL_MOVEMENTS.flatMap(m => m.books)
  return _chronological
}

// ── Minha ordem ─────────────────────────────────────────────────────────

// As duas listas de "Minha ordem": os livros que fazem parte do plano, na
// ordem que a pessoa montou, e os que ela deixou de fora (na ordem da
// Bíblia). `customOrder` (o que está guardado) é a lista dos que entram;
// nunca configurado, entram os 66 na ordem canônica.
export function customBookLists(customOrder) {
  const canonical = canonicalBookOrder()
  const known = new Set(canonical)
  const seen = new Set()
  const included = (Array.isArray(customOrder) ? customOrder : []).filter(b => known.has(b) && !seen.has(b) && seen.add(b))
  if (included.length === 0) return { included: [...canonical], excluded: [] }
  return { included, excluded: canonical.filter(b => !seen.has(b)) }
}

// Arrasta um livro da posição `from` para a posição `to` da fila.
export function moveBook(order, from, to) {
  if (from === to || from < 0 || from >= order.length) return order
  const target = Math.max(0, Math.min(order.length - 1, to))
  const next = [...order]
  const [book] = next.splice(from, 1)
  next.splice(target, 0, book)
  return next
}

// Põe um livro no plano (no fim da fila) ou tira. O plano nunca fica sem
// livro nenhum: tirar o último não faz nada.
export function setBookIncluded(order, book, included) {
  if (included) return order.includes(book) ? order : [...order, book]
  return order.length > 1 ? order.filter(b => b !== book) : order
}

// Escolha rápida dos livros do plano ("Todos", "Antigo Testamento", "Novo
// Testamento"): ficam só os livros de `books`. Os que já estavam na fila
// mantêm a ordem que a pessoa montou; os que entram agora vão para o fim.
export function keepBooks(order, books) {
  const wanted = new Set(books)
  const kept = order.filter(b => wanted.has(b))
  return [...kept, ...books.filter(b => !kept.includes(b))]
}

// Arrastar na lista: para qual posição vai o livro que saiu de `from` e já
// andou `offset` px (linhas de `rowHeight` px, `count` linhas)…
export function dragTargetIndex(from, offset, rowHeight, count) {
  return Math.max(0, Math.min(count - 1, from + Math.round(offset / rowHeight)))
}

// …e quanto cada uma das outras linhas se afasta para abrir o lugar.
export function dragRowShift(index, from, target, rowHeight) {
  if (from < target && index > from && index <= target) return -rowHeight
  if (target < from && index >= target && index < from) return rowHeight
  return 0
}

// ── A fila do plano ─────────────────────────────────────────────────────

// Os livros do plano, na ordem em que são lidos. Em "minha ordem", só os
// que a pessoa escolheu; na ordem livre, a ordem da Bíblia (o que muda é
// de onde o plano segue — ver planStart).
export function resolveBookOrder(mode, customOrder, readingOrder = 'ot_first') {
  if (mode === 'chronological') return chronologicalBookOrder()
  if (mode === 'custom') return customBookLists(customOrder).included
  return canonicalBookOrder(readingOrder)
}

// De onde o plano segue: na ordem livre, de onde a pessoa estiver na
// leitura do plano (`position.free`); nas outras, do ponto de partida que
// ela escolheu (`position.start`), se escolheu. Um ponto num livro que não
// está no plano não vale.
export function planStart(mode, position, bookOrder) {
  const point = mode === 'free' ? position?.free : position?.start
  if (!point?.book || !(point.chapter >= 1)) return null
  return bookOrder.includes(point.book) ? { book: point.book, chapter: point.chapter } : null
}

// A fila de um plano: os livros em ordem e de onde ele segue.
// `kind` 'fixed' — o plano de sempre (ordem da Bíblia, minha ordem ou
// ordem livre); 'chrono' — o plano cronológico, que tem os seus próprios
// movimentos.
export function planQueue(kind, mode, customOrder, position, readingOrder = 'ot_first') {
  const order = kind === 'chrono' ? 'chronological' : mode === 'chronological' ? 'canonical' : mode
  const bookOrder = resolveBookOrder(order, customOrder, readingOrder)
  return { bookOrder, start: planStart(order, position, bookOrder) }
}

// Onde a divisão em sessões recomeça: no capítulo do ponto de partida,
// quando ele cai no meio de um livro (ver buildBookSessions).
export function splitPointsFor(start) {
  return start && start.chapter > 1 ? { [start.book]: start.chapter } : null
}

// A fila girada pelo ponto de partida, capítulo a capítulo: do ponto em
// diante, depois os livros seguintes, depois os de antes e, por fim, o
// começo do livro do ponto de partida.
function chapterQueue(bookOrder, bookChapterCounts, start) {
  const span = (book, from, to) => (to >= from ? [{ book, from, to }] : [])
  const whole = book => span(book, 1, bookChapterCounts[book] ?? 0)
  const at = start ? bookOrder.indexOf(start.book) : -1
  if (at === -1) return bookOrder.flatMap(whole)
  const total = bookChapterCounts[start.book] ?? 0
  return [
    ...span(start.book, start.chapter, total),
    ...bookOrder.slice(at + 1).flatMap(whole),
    ...bookOrder.slice(0, at).flatMap(whole),
    ...span(start.book, 1, Math.min(start.chapter - 1, total)),
  ]
}

// Primeiro capítulo que falta, varrendo a fila a partir do ponto de partida
// (sem ponto, do começo) — devolve null quando o plano inteiro já foi lido
// (todo livro da fila, todo capítulo, em completedSet).
export function resolveNextChapter(completedSet, bookOrder, bookChapterCounts, start = null) {
  for (const { book, from, to } of chapterQueue(bookOrder, bookChapterCounts, start)) {
    for (let ch = from; ch <= to; ch++) {
      if (!completedSet.has(`${book}:${ch}`)) return { book, chapter: ch }
    }
  }
  return null
}

// As sessões do plano na ordem da fila — [{ session, block }]. `blocks` e
// `sessionsByBlock` são os de sempre (deriveProgress/deriveChronoProgress):
// cada livro com as suas sessões em ordem de capítulo e a reflexão que o
// fecha. Com ponto de partida no meio de um livro, o que vem do ponto em
// diante abre a fila; o começo do livro (e a reflexão dele, que só faz
// sentido com o livro inteiro lido) vai para o fim.
export function orderedPlanSessions({ blocks, sessionsByBlock, bookOrder, start = null }) {
  const byBook = new Map()
  for (const block of blocks) {
    for (const session of sessionsByBlock[block.id] ?? []) {
      if (!byBook.has(session.book)) byBook.set(session.book, [])
      byBook.get(session.book).push({ session, block })
    }
  }
  const books = bookOrder.filter(book => byBook.has(book))
  const all = list => list.flatMap(book => byBook.get(book))
  const at = start ? books.indexOf(start.book) : -1
  if (at === -1) return all(books)
  const own = byBook.get(start.book)
  // (Sem divisão no ponto de partida — os ritmos fixos —, a sessão que
  // contém o capítulo escolhido abre a fila.)
  const ahead = own.filter(e => e.session.type !== 'reflection' && e.session.chEnd >= start.chapter)
  const behind = own.filter(e => !ahead.includes(e))
  // Nada ficou para trás (começa no capítulo 1): o livro entra inteiro.
  if (!behind.some(e => e.session.type !== 'reflection')) return [...own, ...all(books.slice(at + 1)), ...all(books.slice(0, at))]
  return [...ahead, ...all(books.slice(at + 1)), ...all(books.slice(0, at)), ...behind]
}

// A sessão (e o bloco) que cobre um capítulo — para abrir a leitura do
// plano num texto escolhido. null se o livro não existe.
export function sessionAt({ blocks, sessionsByBlock }, book, chapter) {
  const block = blocks.find(b => b.books.includes(book))
  const session = block ? sessionsByBlock[block.id].find(s => s.book === book && s.type !== 'reflection' && s.chStart <= chapter && chapter <= s.chEnd) : null
  return session ? { session, block } : null
}

// A sessão onde o plano está: a primeira ainda não concluída, na ordem da
// fila. Com tudo lido, devolve a última (e `finished: true`).
export function findPlanSession(queue) {
  const ordered = orderedPlanSessions(queue)
  if (ordered.length === 0) return null
  const next = ordered.find(e => e.session.status !== 'done')
  return next ? { ...next, finished: false } : { ...ordered[ordered.length - 1], finished: true }
}

// Quantas sessões do plano estão feitas e quantas são no total (só os
// livros da fila).
export function planTotals(queue) {
  const ordered = orderedPlanSessions(queue)
  return { done: ordered.filter(e => e.session.status === 'done').length, total: ordered.length }
}
