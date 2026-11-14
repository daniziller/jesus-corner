// buscaDaBiblioteca.js — a busca da aba Biblioteca (handoff-biblioteca-55
// §6), parte pura. Aqui, o que vem antes de digitar (L4): os tipos de
// "Buscar em", os três seletores de "Refinar" (livro, período, pregador)
// com o que cada folha oferece, as etiquetas mais usadas e as buscas
// recentes — e a combinação tipo + livro + período + pregador, que os
// resultados (L5) também usam. Testes em scripts/test-biblioteca-busca.mjs.
import { normalizeForSearch } from '../bible/searchNormalize.js'
import { GAMIFICATION_BLOCKS, bookInfo } from '../data/gamificationBlocks.js'
import { bookDisplayName } from '../busca/referencia.js'
import { addRecentSearch } from '../busca/buscaMath.js'
import { formatInt, plural, monthName } from '../gamification/format.js'
import { dateKey } from '../utils/dateKey.js'
import { LIBRARY_TYPES, booksOf } from './bibliotecaMath.js'

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()
const samePerson = name => normalizeForSearch(oneLine(name))

// ── Buscar em ───────────────────────────────────────────────────────────

// As pastilhas de "Buscar em": Tudo, os seis tipos na ordem da raiz e
// Estudos. Uma ativa por vez.
export const SEARCH_TYPES = [
  { key: 'all', label: 'Tudo' },
  ...LIBRARY_TYPES.map(t => ({ key: t.type, label: t.name })),
  { key: 'estudo', label: 'Estudos' },
]
export function searchTypeLabel(key) {
  return (SEARCH_TYPES.find(t => t.key === key) ?? SEARCH_TYPES[0]).label
}

// ── Refinar ─────────────────────────────────────────────────────────────

// O que está escolhido em "Refinar" quando nada foi escolhido.
export const NO_REFINE = { book: null, period: { key: 'always' }, preacher: null }

export function isRefined({ book = null, period = NO_REFINE.period, preacher = null } = {}) {
  return !!book || period.key !== 'always' || !!preacher
}

// As opções da folha de período.
export const PERIODS = [
  { key: 'always', label: 'Sempre' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mês' },
  { key: 'year', label: 'Este ano' },
  { key: 'custom', label: 'De… até…' },
]

// O intervalo de um período, em dias do aparelho ("AAAA-MM-DD"): a
// semana começa na segunda (como a semana do plano); o mês e o ano, no
// dia 1º. `custom` usa as duas datas escolhidas (qualquer uma pode
// faltar). "Sempre" não tem intervalo.
export function periodRange(period, now = new Date()) {
  const key = period?.key ?? 'always'
  if (key === 'always') return null
  const today = dateKey(now)
  if (key === 'week') {
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
    return { from: dateKey(monday), to: today }
  }
  if (key === 'month') return { from: dateKey(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
  if (key === 'year') return { from: dateKey(new Date(now.getFullYear(), 0, 1)), to: today }
  const from = period.from || null
  const to = period.to || null
  if (!from && !to) return null
  return from && to && from > to ? { from: to, to: from } : { from, to }
}

const shortDay = key => {
  const [year, month, day] = key.split('-').map(Number)
  return `${day} ${monthName(new Date(year, month - 1, 1)).slice(0, 3)}`
}

// O que o seletor de período mostra: "Sempre", "Esta semana"… e, com
// datas escolhidas, "3 nov – 10 nov" ("desde 3 nov", "até 10 nov").
export function periodLabel(period) {
  const key = period?.key ?? 'always'
  if (key !== 'custom') return (PERIODS.find(p => p.key === key) ?? PERIODS[0]).label
  const range = periodRange(period)
  if (!range) return PERIODS[0].label
  if (range.from && range.to) return `${shortDay(range.from)} – ${shortDay(range.to)}`
  return range.from ? `desde ${shortDay(range.from)}` : `até ${shortDay(range.to)}`
}

// Um período "De… até…" sem data nenhuma é o mesmo que "Sempre".
export function normalizePeriod(period) {
  return period?.key === 'custom' && !periodRange(period) ? { key: 'always' } : (period ?? { key: 'always' })
}

function inRange(item, range) {
  if (!range) return true
  if (!item.at) return false
  const day = dateKey(new Date(item.at))
  return (!range.from || day >= range.from) && (!range.to || day <= range.to)
}

// Os itens que passam por tipo + livro + período + pregador, combinados.
// Livro: o item precisa estar ligado àquele livro (uma pregação, por uma
// das passagens). Pregador: só pregações têm; com pregador escolhido, os
// outros tipos ficam de fora.
export function refineItems(items, { type = 'all', book = null, period = NO_REFINE.period, preacher = null } = {}, now = new Date()) {
  const range = periodRange(period, now)
  const who = preacher ? samePerson(preacher) : null
  return items.filter(item =>
    (type === 'all' || item.type === type)
    && (!book || booksOf(item).includes(book))
    && inRange(item, range)
    && (!who || (item.type === 'pregacao' && samePerson(item.preacher) === who)))
}

// A folha de livro: só os livros em que a pessoa tem algo, por bloco, na
// ordem da Bíblia, com quantos itens em cada.
export function bookOptions(items, lang = 'pt') {
  const counts = {}
  for (const item of items) for (const book of booksOf(item)) counts[book] = (counts[book] ?? 0) + 1
  return GAMIFICATION_BLOCKS
    .map(block => ({
      id: block.id, name: block.nome,
      books: block.livros.filter(b => counts[b.nome]).map(b => ({ book: b.nome, label: bookDisplayName(b.nome, lang), count: formatInt(counts[b.nome]) })),
    }))
    .filter(block => block.books.length > 0)
}

// A folha de pregador: os pregadores das anotações da pessoa, do que tem
// mais anotações para o que tem menos (no empate, em ordem alfabética). O
// mesmo nome escrito com outra caixa ou acento conta junto.
export function preacherOptions(items) {
  const byKey = new Map()
  for (const item of items) {
    if (item.type !== 'pregacao' || !item.preacher) continue
    const key = samePerson(item.preacher)
    const entry = byKey.get(key) ?? { key, label: item.preacher, n: 0 }
    entry.n++
    byKey.set(key, entry)
  }
  return [...byKey.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, 'pt'))
    .map(({ key, label, n }) => ({ key, label, count: formatInt(n) }))
}

// Os seletores de "Refinar": rótulo, o valor à mostra e se há valor
// aplicado (aí o seletor fica preto). O de pregador só existe para quem
// tem pregações. `aria` é o que o seletor anuncia — "Livro: Gênesis".
export function refineSelectors({ book = null, period = NO_REFINE.period, preacher = null } = {}, items = [], lang = 'pt') {
  const selectors = [
    { key: 'book', label: 'Livro', value: book ? bookDisplayName(book, lang) : 'Qualquer', applied: !!book },
    { key: 'period', label: 'Período', value: periodLabel(period), applied: normalizePeriod(period).key !== 'always' },
  ]
  if (items.some(i => i.type === 'pregacao')) selectors.push({ key: 'preacher', label: 'Pregador', value: preacher || 'Qualquer', applied: !!preacher })
  return selectors.map(sel => ({ ...sel, aria: `${sel.label}: ${sel.value}` }))
}

// ── Suas etiquetas ──────────────────────────────────────────────────────

export const TAG_CLOUD = 8

// As etiquetas mais usadas (até oito), com quantos itens em cada.
export function tagCloud(items, max = TAG_CLOUD) {
  const counts = new Map()
  for (const item of items) for (const tag of new Set((item.tags ?? []).map(oneLine).filter(Boolean))) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt'))
    .slice(0, max)
    .map(([tag, n]) => ({ tag, label: `# ${tag}`, count: formatInt(n) }))
}

// ── Buscas recentes ─────────────────────────────────────────────────────

// Onde uma busca achou: com um tipo só, "6 pregações"; com dois, "4
// anotações · notas e marcações"; com três ou mais, "18 anotações · em
// tudo". `counts` é { tipo: n } só dos tipos com resultado.
const TYPE_NOUN = {
  nota: ['nota', 'notas'], marcacao: ['marcação', 'marcações'], reflexao: ['reflexão', 'reflexões'], pregacao: ['pregação', 'pregações'],
  aplicacao: ['aplicação', 'aplicações'], pergunta: ['pergunta', 'perguntas'], estudo: ['estudo', 'estudos'],
}
export function typeNoun(type, n) {
  const [one, many] = TYPE_NOUN[type] ?? ['anotação', 'anotações']
  return plural(n, one, many)
}
export function recentSub(counts) {
  const found = SEARCH_TYPES.map(t => t.key).filter(key => counts?.[key] > 0)
  const total = found.reduce((sum, key) => sum + counts[key], 0)
  if (found.length === 0) return 'nada encontrado'
  if (found.length === 1) return `${formatInt(total)} ${typeNoun(found[0], total)}`
  const where = found.length === 2 ? found.map(key => TYPE_NOUN[key][1]).join(' e ') : 'em tudo'
  return `${formatInt(total)} ${plural(total, 'anotação', 'anotações')} · ${where}`
}

// Uma busca feita entra no topo das recentes (até cinco, sem repetir o
// mesmo texto) — a mesma regra das buscas recentes da Bíblia.
export function rememberLibrarySearch(list, { text, counts }) {
  return addRecentSearch(list, { text: oneLine(text), sub: recentSub(counts) })
}
