// bibliotecaMath.js — a aba Biblioteca (handoff-biblioteca-55), parte
// pura: o que entra na Biblioteca, as contagens por tipo, o total, os
// quadrados da raiz, o cartão de Estudos e os três mais recentes. Tudo o
// que a aba mostra de número sai daqui — a raiz, as telas de tipo e a
// busca contam com as mesmas funções. Testes em scripts/test-biblioteca.mjs.
//
// A Biblioteca só lê o que é da pessoa: notas, marcações e anotações
// longas da linha dela (user_data) e as perguntas guardadas no aparelho.
// A oração nunca entra — pickLibraryData só deixa passar as colunas
// daqui, então nem chega às contas.
import { parseNoteKey, noteTextOf, noteUpdatedAtOf } from '../notes/noteKeys.js'
import { sermonOwnWordsText } from '../notes/sermonText.js'
import { dateKey } from '../utils/dateKey.js'
import { formatVerseRanges } from '../utils/verseRanges.js'
import { bookInfo } from '../data/gamificationBlocks.js'
import { bookDisplayName } from '../busca/referencia.js'
import { formatInt, dayMonthLong, dayMonthShort, monthYearLong } from '../gamification/format.js'
import { WEEKDAY_FULL } from '../routine/weeklyDaysMath.js'
import { tr, trN } from '../i18n/tr.js'

const tx = (lang, key, vars) => tr(lang, `bibliotecaTx.${key}`, vars)
const txN = (lang, base, n, vars) => trN(lang, `bibliotecaTx.${base}`, n, { n: formatInt(n, lang), ...vars })

// ── Os tipos ────────────────────────────────────────────────────────────

// A ordem dos quadrados (L1 §2.4) — a mesma em toda a aba. `tone` é o
// tratamento do tipo (Marcações em areia, Aplicações em preto, os demais
// em branco); `marker`, o quadradinho ou círculo ao lado do nome; `color`,
// a cor do rótulo do tipo. Os nomes (plural, singular e a linha de
// apoio) vêm de translations.js, no idioma da conta — libraryTypes(lang).
export const LIBRARY_TYPES = [
  { type: 'nota', tone: 'white', marker: 'square', color: 'ink' },
  { type: 'marcacao', tone: 'sand', marker: 'square', color: 'sand' },
  { type: 'reflexao', tone: 'white', marker: 'square', color: 'accent' },
  { type: 'pregacao', tone: 'white', marker: 'square', color: 'sand' },
  { type: 'aplicacao', tone: 'white', marker: 'circle', color: 'accent' },
  { type: 'pergunta', tone: 'white', marker: 'circle', color: 'ink' },
]
const withNames = (t, lang) => ({ ...t, name: tx(lang, `type_${t.type}`), singular: tx(lang, `one_${t.type}`), support: tx(lang, `support_${t.type}`) })
export function libraryTypes(lang = 'pt') {
  return LIBRARY_TYPES.map(t => withNames(t, lang))
}
const TYPE_OF = Object.fromEntries(LIBRARY_TYPES.map(t => [t.type, t]))
export function typeMeta(type, lang = 'pt') {
  return TYPE_OF[type] ? withNames(TYPE_OF[type], lang) : null
}

// ── O que entra ─────────────────────────────────────────────────────────

// Da linha da pessoa, só as colunas da Biblioteca. Pedidos e estatísticas
// de oração (e qualquer outra coluna) ficam de fora aqui, antes de tudo.
export function pickLibraryData(row) {
  const list = value => (Array.isArray(value) ? value : [])
  return {
    notes: row?.notes && typeof row.notes === 'object' ? row.notes : {},
    highlights: list(row?.highlights),
    sermonNotes: list(row?.sermon_notes),
    aiStudies: list(row?.ai_studies),
    inductiveStudies: list(row?.inductive_studies),
    studiesCompleted: list(row?.studies_completed),
    activeStudyId: row?.active_study?.studyId ?? null,
  }
}

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// Uma anotação longa aberta por engano e fechada sem nada escrito não é
// uma anotação (a mesma regra de JourneyScreen.jsx/sermonDraftHasContent).
export function sermonHasContent(note) {
  if (!note) return false
  if ([note.title, note.preacher, note.church, note.link].some(v => String(v ?? '').trim())) return true
  if ((note.passages ?? []).length > 0) return true
  return sermonOwnWordsText(note).trim().length > 0
}

// Quando um item do mapa de notas aconteceu: o dia da chave (reflexão e
// frase são do dia em que foram escritas, mesmo editadas depois); sem dia
// na chave, a última atualização.
function noteMoment(entry, date) {
  const updatedAt = noteUpdatedAtOf(entry)
  if (!date) return updatedAt
  return updatedAt && dateKey(new Date(updatedAt)) === date ? updatedAt : `${date}T12:00:00`
}

// Todos os itens da Biblioteca, um por registro, já com o tipo. Uma
// marcação com nota é UM item, do tipo marcação — a nota vai dentro dela,
// nunca é contada de novo em Notas. Vira "nota" a marcação que nasceu
// como nota (`kind: 'note'`, a nota de versículo N4) e a nota da sessão
// de leitura (presa aos capítulos). Reflexão de fim de livro e
// retrospectiva do mês entram em Reflexões.
export function libraryItems({ notes = {}, highlights = [], sermonNotes = [], questions = [] } = {}) {
  const items = []
  for (const h of highlights) {
    if (!h || h.hidden || !h.id || !h.book || !h.chapter || !h.verses?.length) continue
    const text = String(h.text ?? '').trim()
    const base = { id: h.id, at: h.createdAt ?? h.updatedAt ?? null, book: h.book, bookEn: h.bookEn ?? null, chapter: h.chapter, verses: [...h.verses].sort((a, b) => a - b), tags: (h.tags ?? []).filter(Boolean) }
    if (h.kind === 'note' && text) items.push({ ...base, key: `nota:${h.id}`, type: 'nota', text })
    else items.push({ ...base, key: `marcacao:${h.id}`, type: 'marcacao', note: text })
  }
  for (const [key, entry] of Object.entries(notes)) {
    const text = noteTextOf(entry).trim()
    if (!text) continue
    const parsed = parseNoteKey(key)
    if (parsed.type === 'reading') items.push({ key: `nota:${key}`, type: 'nota', noteKey: key, at: noteMoment(entry), book: parsed.book, chapter: parsed.chStart, chapterEnd: parsed.chEnd, verses: null, text, tags: [] })
    else if (parsed.type === 'daily-reflection') items.push({ key: `reflexao:${key}`, type: 'reflexao', kind: 'dia', noteKey: key, date: parsed.date, at: noteMoment(entry, parsed.date), text })
    else if (parsed.type === 'book-reflection') items.push({ key: `reflexao:${key}`, type: 'reflexao', kind: 'livro', noteKey: key, book: parsed.book, at: noteMoment(entry), text })
    else if (parsed.type === 'recap') items.push({ key: `reflexao:${key}`, type: 'reflexao', kind: 'mes', noteKey: key, month: parsed.month, at: noteMoment(entry), text })
    else if (parsed.type === 'application-phrase') items.push({ key: `aplicacao:${key}`, type: 'aplicacao', noteKey: key, date: parsed.date, at: noteMoment(entry, parsed.date), text, fulfilled: !!(typeof entry === 'object' && entry?.fulfilled) })
  }
  for (const s of sermonNotes) {
    if (!s?.id || !sermonHasContent(s)) continue
    items.push({
      key: `pregacao:${s.id}`, type: 'pregacao', id: s.id,
      at: s.createdAt ?? (s.date ? `${s.date}T12:00:00` : s.updatedAt ?? null),
      updatedAt: s.updatedAt ?? null,
      noteType: s.noteType ?? 'sermon', title: oneLine(s.title), preacher: oneLine(s.preacher), church: oneLine(s.church),
      passages: s.passages ?? [], text: sermonOwnWordsText(s).trim(), tags: (s.tags ?? []).filter(Boolean), draft: !s.finalizedAt,
    })
  }
  for (const q of questions) {
    if (!q?.question || !q.book || !q.chapter) continue
    items.push({
      key: `pergunta:${q.book}:${q.chapter}:${q.verseStart}-${q.verseEnd}:${q.createdAt}`, type: 'pergunta',
      at: q.createdAt ?? null, book: q.book, bookEn: q.bookEn ?? null, chapter: q.chapter, verseStart: q.verseStart, verseEnd: q.verseEnd,
      text: oneLine(q.question), question: q.question, answer: q.answer?.outcome === 'answer' ? String(q.answer.reply ?? '') : '',
    })
  }
  return items
}

// Mais recentes primeiro; sem data, no fim (na ordem em que vieram).
export function byRecent(items) {
  return [...items].sort((a, b) => String(b.at ?? '').localeCompare(String(a.at ?? '')))
}

// ── Contagens ───────────────────────────────────────────────────────────

// Quantos itens em cada tipo, e o total — a soma dos seis (estudos não
// entram).
export function libraryCounts(items) {
  const counts = Object.fromEntries(LIBRARY_TYPES.map(t => [t.type, 0]))
  for (const item of items) if (item.type in counts) counts[item.type]++
  return { ...counts, total: LIBRARY_TYPES.reduce((sum, t) => sum + counts[t.type], 0) }
}

// Os livros da Bíblia a que um item está ligado (nomes canônicos): o do
// versículo, os das passagens citadas numa pregação, os das sessões de um
// estudo e, numa reflexão ou frase do dia, os que foram lidos naquele dia
// (`read`, de withReadings).
export function booksOf(item) {
  const names = item.type === 'pregacao' ? (item.passages ?? []).map(p => p.book)
    : item.type === 'estudo' ? item.books ?? []
    : item.read?.length ? item.read.map(r => r.book)
    : [item.book]
  return [...new Set(names.filter(name => name && bookInfo(name)))]
}

// A reflexão e a frase do dia só guardam o texto e o dia: os capítulos
// lidos naquele dia (chaptersByDay) ligam as duas a um livro — para o
// filtro de livro e a busca por referência.
export function withReadings(items, readByDay = {}) {
  return items.map(item => {
    const read = (item.type === 'reflexao' && item.kind === 'dia') || item.type === 'aplicacao' ? readByDay[item.date] : null
    return read?.length ? { ...item, read: read.filter(r => bookInfo(r.book)) } : item
  })
}

// O cartão do total (L1 §2.3): "128 · anotações guardadas · em 23 livros
// da Bíblia · 9 este mês". O que for zero some da segunda linha.
export function totalCard(items, now = new Date(), lang = 'pt') {
  const { total } = libraryCounts(items)
  const books = new Set(items.flatMap(booksOf)).size
  const month = dateKey(now).slice(0, 7)
  const thisMonth = items.filter(i => i.at && dateKey(new Date(i.at)).slice(0, 7) === month).length
  const parts = []
  if (books > 0) parts.push(txN(lang, 'inBooks', books))
  if (thisMonth > 0) parts.push(tx(lang, 'thisMonth', { n: formatInt(thisMonth, lang) }))
  return { total: formatInt(total, lang), label: txN(lang, 'saved', total), sub: parts.join(' · ') }
}

// ── Quando ──────────────────────────────────────────────────────────────

const dayNumber = date => Math.round(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000)

// "hoje" · "ontem" · "há 3 dias" · "12 out" (de uma semana para trás; com
// o ano, se não for o corrente). `weekday`: de dois a seis dias atrás, o
// dia da semana no lugar de "há N dias" — "domingo", a data de uma
// pregação.
export function whenLabel(iso, now = new Date(), { weekday = false, lang = 'pt' } = {}) {
  if (!iso) return ''
  const d = new Date(iso)
  const days = dayNumber(now) - dayNumber(d)
  if (days <= 0) return tx(lang, 'today')
  if (days === 1) return tx(lang, 'yesterday')
  if (days < 7) return weekday ? (WEEKDAY_FULL[lang] ?? WEEKDAY_FULL.pt)[(d.getDay() + 6) % 7] : tx(lang, 'daysAgo', { n: days })
  const short = dayMonthShort(d, lang)
  return d.getFullYear() === now.getFullYear() ? short : `${short} ${d.getFullYear()}`
}

// ── Os quadrados (L1 §2.4) ──────────────────────────────────────────────

// Um quadrado por tipo, na ordem fixa: nome, contagem e a linha de apoio
// — "Presas a um versículo · última ontem". Com zero itens o quadrado
// continua, com "0" e o apoio sem o trecho do "quando". Aplicações e
// Perguntas têm apoio fixo. `aria` é o que o quadrado anuncia.
export function typeTiles(items, now = new Date(), lang = 'pt') {
  const counts = libraryCounts(items)
  const latest = {}
  for (const item of byRecent(items)) if (item.at && !latest[item.type]) latest[item.type] = item.at
  return libraryTypes(lang).map(meta => {
    const count = formatInt(counts[meta.type], lang)
    const last = latest[meta.type]
    let support = meta.support
    if (last && meta.type === 'pregacao') support += ` · ${whenLabel(last, now, { weekday: true, lang })}`
    else if (last && meta.type !== 'aplicacao' && meta.type !== 'pergunta') support += ` · ${tx(lang, 'latest', { when: whenLabel(last, now, { lang }) })}`
    return { type: meta.type, name: meta.name, tone: meta.tone, marker: meta.marker, color: meta.color, count, support, aria: `${meta.name}, ${count}` }
  })
}

// ── Títulos e referências ───────────────────────────────────────────────

// "Salmos 23:4" · "Gênesis 1–2" (nota de sessão) · "Gênesis 39" (pergunta
// sem versículo).
export function itemReference(item, lang = 'pt') {
  if (!item?.book) return ''
  const name = bookDisplayName(item.book, lang)
  if (item.verses?.length) return `${name} ${item.chapter}:${formatVerseRanges(item.verses)}`
  if (item.verseStart) return `${name} ${item.chapter}:${item.verseStart}${item.verseEnd && item.verseEnd !== item.verseStart ? `–${item.verseEnd}` : ''}`
  return `${name} ${item.chapter}${item.chapterEnd && item.chapterEnd !== item.chapter ? `–${item.chapterEnd}` : ''}`
}

// Os capítulos lidos em cada dia (registro chapters_read), para dar o
// livro e o capítulo a uma reflexão — que só guarda o texto e o dia.
export function chaptersByDay(chapterRows) {
  const map = {}
  for (const row of chapterRows ?? []) {
    if (!row?.created_at || !row.livro || !row.capitulo) continue
    const day = dateKey(new Date(row.created_at))
    ;(map[day] ??= []).push({ book: row.livro, chapter: Number(row.capitulo) })
  }
  return map
}

// O título de uma reflexão: o livro e os capítulos lidos naquele dia
// ("Gênesis 41", "Gênesis 40–41"); sem registro de leitura no dia, a data
// ("Reflexão de 8 de novembro"). Fim de livro e retrospectiva do mês
// seguem com os nomes que já tinham na Biblioteca ("Reflexão de
// fechamento", "Seu mês").
export function reflectionTitle(item, readByDay = {}, lang = 'pt') {
  if (item.kind === 'livro') return tx(lang, 'closingReflection', { book: bookDisplayName(item.book, lang) })
  if (item.kind === 'mes') {
    const [year, month] = String(item.month).split('-').map(Number)
    const name = monthYearLong(new Date(year, month - 1, 1), lang)
    return tx(lang, 'yourMonth', { month: `${name.charAt(0).toUpperCase()}${name.slice(1)}` })
  }
  const read = (readByDay[item.date] ?? []).filter(r => bookInfo(r.book))
  if (read.length) {
    const book = read[0].book
    const chapters = read.filter(r => r.book === book).map(r => r.chapter)
    const first = Math.min(...chapters)
    const last = Math.max(...chapters)
    return `${bookDisplayName(book, lang)} ${first}${last !== first ? `–${last}` : ''}`
  }
  return tx(lang, 'reflectionOf', { date: dayMonthLong(`${item.date}T12:00:00`, lang) })
}

// A primeira resposta de uma reflexão. A nota do dia com perguntas é
// "pergunta\nresposta" em blocos (reflexaoMath.js/combineQaText); a
// folha livre é só texto.
export function reflectionFirstAnswer(text) {
  const block = String(text ?? '').split(/\n\s*\n/)[0] ?? ''
  const lines = block.split('\n')
  const answer = lines.length > 1 && lines[0].trim().endsWith('?') ? lines.slice(1).join(' ') : block
  return oneLine(answer)
}

const firstWords = (text, max = 6) => oneLine(text).split(' ').slice(0, max).join(' ')

// O título de um item nas listas que misturam tipos ("Recentes", L1 §2.6):
// Reflexão — o livro e o capítulo do dia; Pregação — "{Pregador} ·
// {Instituição}" (sem os dois, o título; sem título, as primeiras
// palavras); Nota e Marcação — a referência; Aplicação — a frase;
// Pergunta — a pergunta.
export function itemTitle(item, { readByDay = {}, lang = 'pt' } = {}) {
  if (item.type === 'reflexao') return reflectionTitle(item, readByDay, lang)
  if (item.type === 'pregacao') return [item.preacher, item.church].filter(Boolean).join(' · ') || item.title || firstWords(item.text) || tx(lang, 'entryFallback')
  if (item.type === 'nota' || item.type === 'marcacao') return itemReference(item, lang)
  return item.text
}

// Uma linha do texto de um item. A marcação sem nota mostra o próprio
// trecho (`verseTexts[key]`, carregado à parte — a marcação não guarda o
// texto do versículo).
export function itemLine(item, { verseTexts = {} } = {}) {
  if (item.type === 'reflexao') return item.kind === 'dia' ? reflectionFirstAnswer(item.text) : oneLine(item.text)
  if (item.type === 'pregacao') return oneLine(item.text)
  if (item.type === 'nota') return oneLine(item.text)
  if (item.type === 'marcacao') return oneLine(item.note) || (verseTexts[item.key] ? `"${oneLine(verseTexts[item.key])}"` : '')
  if (item.type === 'pergunta') return oneLine(item.answer)
  return ''
}

// ── Recentes (L1 §2.6) ──────────────────────────────────────────────────

export const RECENT_LIMIT = 3

// Os três itens mais recentes, de qualquer tipo.
export function recentItems(items, limit = RECENT_LIMIT) {
  return byRecent(items).filter(i => i.at).slice(0, limit)
}

// Cada linha de "Recentes": o rótulo do tipo no singular (na cor do
// tipo), quando, o título e uma linha do texto.
export function recentRows(items, { now = new Date(), readByDay = {}, verseTexts = {}, lang = 'pt' } = {}) {
  return recentItems(items).map(item => {
    const meta = typeMeta(item.type, lang)
    return {
      key: item.key, item, label: meta.singular, color: meta.color,
      when: whenLabel(item.at, now, { weekday: item.type === 'pregacao', lang }),
      title: itemTitle(item, { readByDay, lang }),
      line: itemLine(item, { verseTexts }),
    }
  })
}

// ── Estudos (L1 §2.5) ───────────────────────────────────────────────────

// Os estudos da pessoa (criados, adotados e indutivos) e o que está em
// andamento. Dia feito: `completedAt` na sessão (estudos de hoje) ou a
// marca antiga em `completed` (studies_completed) — a mesma leitura de
// meuPlano/activeStudy.js.
export function studiesSummary({ catalog = [], ai = [], inductive = [], completed = [], activeStudyId = null } = {}) {
  const mine = [...ai, ...inductive]
  const done = new Set(completed)
  const active = activeStudyId ? [...mine, ...catalog].find(s => s.id === activeStudyId) : null
  let current = null
  if (active) {
    const sessions = active.sessions ?? []
    const total = sessions.length
    const doneCount = sessions[0]?.book
      ? sessions.filter(s => s.completedAt).length
      : sessions.filter(s => done.has(`${active.id}:${s.id}`)).length
    if (total > 0) current = { id: active.id, title: active.title ?? active.titleEn ?? '', ...(active.titleEn ? { titleEn: active.titleEn } : {}), day: Math.min(doneCount + 1, total), total }
  }
  const count = mine.length + (active && !mine.includes(active) ? 1 : 0)
  return { count, active: current }
}

// Os estudos da pessoa como itens, para a busca: o nome e em que dia
// está ("dia 2 de 6"; concluído, o total).
export function studyItems({ ai = [], inductive = [], completed = [] } = {}) {
  const done = new Set(completed)
  return [...ai, ...inductive].filter(s => s?.id).map(study => {
    const sessions = study.sessions ?? []
    const total = sessions.length
    const doneCount = sessions[0]?.book ? sessions.filter(s => s.completedAt).length : sessions.filter(s => done.has(`${study.id}:${s.id}`)).length
    return {
      key: `estudo:${study.id}`, type: 'estudo', id: study.id, title: String(study.title ?? study.titleEn ?? '').trim(), titleEn: study.titleEn ? String(study.titleEn).trim() : null,
      at: study.createdAt ?? null, day: Math.min(doneCount + 1, Math.max(total, 1)), total, finished: total > 0 && doneCount >= total,
      books: [...new Set([study.book, ...sessions.map(s => s.book)].filter(Boolean))],
    }
  })
}

// O cartão preto: com estudo em andamento, "{Nome} · dia {x} de {y}" e a
// barra; sem, "{n} estudos guardados" e sem barra; sem nenhum estudo,
// "Criar um estudo" (abre 35d).
export function studiesCard({ count = 0, active = null } = {}, lang = 'pt') {
  if (count === 0) return { label: tx(lang, 'type_estudo'), title: tx(lang, 'createStudy'), progress: null, action: 'create' }
  const label = tx(lang, 'studiesCount', { n: formatInt(count, lang) })
  if (active) return { label, title: tx(lang, 'studyDay', { title: (lang === 'en' && active.titleEn) || active.title, day: active.day, total: active.total }), progress: active.day / active.total, action: 'open' }
  return { label, title: txN(lang, 'studiesSaved', count), progress: null, action: 'open' }
}

// ── Estados ─────────────────────────────────────────────────────────────

// Conta nova: nada guardado ainda — no lugar de "Recentes" entra o cartão
// areia com dois exemplos do que se guarda ali (o texto do vazio de 4c).
export function emptyLibraryText(lang = 'pt') {
  return tx(lang, 'emptyLibrary')
}

export function isEmptyLibrary(items) {
  return libraryCounts(items).total === 0
}

// Os textos fixos das telas da Biblioteca (título, botões, rótulos), no
// idioma da conta — os mesmos de translations.js/bibliotecaTx.
export function bibliotecaText(lang, key, vars) {
  return tx(lang, key, vars)
}
