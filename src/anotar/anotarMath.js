// anotarMath.js — a página onde as anotações são feitas (N2 e N3, handoff-
// biblioteca-55 §7A), parte pura: abrir uma anotação de qualquer formato
// sem perder nada, o que é gravado, os blocos do texto (parágrafo, tópico
// numerado, versículo citado como unidade), a segunda linha do cabeçalho,
// e os detalhes — tipo, de onde veio, etiquetas e "Quem vê". Testes em
// scripts/test-anotar.mjs.
//
// O formato do dado não muda: uma anotação é um registro de
// user_data.sermon_notes (sermonNotesStore.js), com o texto em `body` —
// uma lista de blocos { id, type: 'text' | 'topic' | 'quote' | 'link',
// text, … } — e uma cópia corrida em `text`. Anotações de antes dos
// blocos só têm `text`: abrem como um bloco de texto.
import { sermonOwnWordsText } from '../notes/sermonText.js'
import { dateKey } from '../utils/dateKey.js'
import { formatWeekdayDate } from '../utils/weekdayDateLabel.js'
import { formatInt, plural } from '../gamification/format.js'
import { normalizeForSearch } from '../bible/searchNormalize.js'
import { bookDisplayName } from '../busca/referencia.js'

const oneLine = text => String(text ?? '').replace(/\s+/g, ' ').trim()

// ── Tipos ───────────────────────────────────────────────────────────────

// Os tipos de anotação, na ordem da grade de N3. "Vídeo" é o mesmo tipo
// "Vídeo online" das listas, com o rótulo curto. "Livre" é a anotação
// livre: uma página em branco, sem pregador nem instituição.
export const NOTE_TYPES = [
  { key: 'sermon', label: 'Sermão' },
  { key: 'service', label: 'Culto' },
  { key: 'class', label: 'Aula' },
  { key: 'lecture', label: 'Palestra' },
  { key: 'video', label: 'Vídeo' },
  { key: 'free', label: 'Livre' },
]
const FIXED_TYPES = NOTE_TYPES.map(t => t.key)

// O nome curto de um tipo (a pastilha e a segunda linha de N2, a grade de
// N3). Fora dos seis, é o tipo que a pessoa criou, com as palavras dela.
export function noteTypeName(noteType) {
  return NOTE_TYPES.find(t => t.key === noteType)?.label ?? (oneLine(noteType) || NOTE_TYPES[0].label)
}

// Os tipos que a pessoa já criou ("Outro tipo…"), do usado mais
// recentemente para o mais antigo.
export function customTypesOf(notes) {
  const seen = []
  for (const note of notes ?? []) {
    const type = oneLine(note?.noteType)
    if (type && !FIXED_TYPES.includes(type) && !seen.includes(type)) seen.push(type)
  }
  return seen
}

// A grade de N3: os seis, na ordem fixa, e depois os tipos criados (o da
// anotação aberta entra mesmo que ainda não esteja em nenhuma outra).
export function typeOptions(customTypes = [], current = null) {
  const custom = [...customTypes]
  if (current && !FIXED_TYPES.includes(current) && !custom.includes(current)) custom.push(current)
  return [...NOTE_TYPES, ...custom.map(type => ({ key: type, label: type }))].map(option => ({ ...option, on: option.key === current }))
}

// ── Abrir e gravar ──────────────────────────────────────────────────────

let counter = 0
// Ids no formato de sempre ("seg-…", "sermon-…").
export function newId(prefix, now = Date.now()) {
  counter = (counter + 1) % 1e6
  return `${prefix}-${now}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function newSegment(type, text = '') {
  return { id: newId('seg'), type, text }
}

// Uma anotação nova, em branco. `type`: 'free' para a anotação livre.
export function newNote({ type = 'sermon', now = new Date() } = {}) {
  return {
    id: newId('sermon', now.getTime()), createdAt: now.toISOString(), date: dateKey(now),
    noteType: type, title: '', preacher: '', church: '', link: '',
    passages: [], text: '', body: [newSegment('text')], finalizedAt: null, durationSeconds: 0,
    tags: [], sharedGroupIds: [],
  }
}

// Os blocos de uma anotação guardada. Sem `body` (formato de antes dos
// blocos), um bloco de texto com o `text` inteiro. O último bloco é
// sempre de texto — é onde se continua escrevendo.
export function ensureBody(note) {
  const saved = Array.isArray(note?.body) ? note.body.filter(seg => seg && typeof seg === 'object') : []
  const body = saved.length > 0
    ? saved.map(seg => ({ ...seg, id: seg.id ?? newId('seg'), type: seg.type ?? 'text', text: seg.text ?? '' }))
    : [newSegment('text', note?.text ?? '')]
  return body[body.length - 1].type === 'text' ? body : [...body, newSegment('text')]
}

// Uma anotação guardada (de qualquer formato) pronta para a página: todos
// os campos que ela tinha continuam nela; os que faltam ganham o valor
// vazio. Nada é reescrito aqui — só o que a pessoa mudar é gravado.
export function openNote(saved) {
  return {
    ...saved,
    noteType: saved.noteType ?? 'sermon',
    title: saved.title ?? '', preacher: saved.preacher ?? '', church: saved.church ?? '', link: saved.link ?? '',
    passages: Array.isArray(saved.passages) ? saved.passages : [],
    body: ensureBody(saved),
    finalizedAt: saved.finalizedAt ?? null,
    durationSeconds: saved.durationSeconds ?? 0,
    tags: Array.isArray(saved.tags) ? saved.tags.filter(Boolean) : [],
    sharedGroupIds: Array.isArray(saved.sharedGroupIds) ? saved.sharedGroupIds : [],
  }
}

// A cópia corrida do texto (campo `text`), como sempre foi gravada: o
// versículo citado entre aspas com a referência, o "link" só com a
// referência, o resto como está.
export function plainText(body) {
  return (body ?? []).map(seg => {
    if (seg.type === 'quote') return `"${seg.text}" — ${seg.ref}`
    if (seg.type === 'link') return `→ ${seg.ref}`
    return seg.text
  }).filter(Boolean).join('\n\n')
}

// O registro a gravar, a partir do rascunho: os mesmos campos de sempre
// (a montagem que JourneyScreen.jsx fazia), mais as etiquetas e os grupos
// de "Quem vê". `trim`: ao finalizar, tira as sobras de espaço; no
// rascunho automático não — cortar no meio da digitação comeria o espaço
// que a pessoa acabou de dar.
export function notePayload(draft, { now = new Date(), trim = true } = {}) {
  const clean = value => (trim ? String(value ?? '').trim() : String(value ?? ''))
  const body = draft.body ?? []
  return {
    ...draft,
    updatedAt: now.toISOString(),
    title: clean(draft.title), preacher: clean(draft.preacher), church: clean(draft.church), link: clean(draft.link),
    text: clean(plainText(body)), body,
    finalizedAt: draft.finalizedAt ?? null,
    durationSeconds: draft.durationSeconds ?? 0,
    topics: body.filter(seg => seg.type === 'topic').map(seg => seg.text).filter(Boolean),
    tags: draft.tags ?? [], sharedGroupIds: draft.sharedGroupIds ?? [],
    groupId: draft.groupId ?? null,
  }
}

// Tem algo de verdade escrito? Abrir a página por engano e sair não deixa
// uma anotação vazia na Biblioteca.
export function noteHasContent(draft) {
  if (!draft) return false
  if ([draft.title, draft.preacher, draft.church, draft.link].some(value => String(value ?? '').trim())) return true
  if ((draft.passages ?? []).length > 0) return true
  return sermonOwnWordsText(draft).trim().length > 0
}

// O rascunho em andamento: a anotação não finalizada mais recente (a que
// o lápis flutuante e a linha do rascunho de N1 retomam). Nulo sem
// rascunho.
export function currentDraft(notes) {
  const stamp = note => note.updatedAt ?? note.createdAt ?? ''
  return (notes ?? []).filter(note => note && !note.finalizedAt && noteHasContent(openNote(note)))
    .sort((a, b) => stamp(b).localeCompare(stamp(a)))[0] ?? null
}

// A cópia do rascunho que ficou no aparelho ainda precisa ser gravada?
// Sim, se tem algo escrito e a conta não tem aquela anotação ou tem uma
// versão mais antiga dela (o app foi fechado antes de a gravação chegar).
export function pendingLocalDraft(local, notes) {
  if (!local?.id || !noteHasContent(openNote(local))) return null
  const stored = (notes ?? []).find(note => note.id === local.id)
  if (!stored) return local
  return (local.updatedAt ?? '') > (stored.updatedAt ?? '') ? local : null
}

// ── Os blocos do texto ──────────────────────────────────────────────────

// O número de cada tópico: automático e contínuo, na ordem do texto —
// { [id do bloco]: n }.
export function topicNumbers(body) {
  const numbers = {}
  let n = 0
  for (const seg of body ?? []) if (seg.type === 'topic') numbers[seg.id] = ++n
  return numbers
}

const isBlank = seg => !String(seg?.text ?? '').trim()

// Onde um bloco novo entra: logo depois do bloco com o cursor; sem cursor,
// no fim — antes do parágrafo vazio que fecha a página.
function insertIndex(body, focusedId) {
  const at = focusedId ? body.findIndex(seg => seg.id === focusedId) : -1
  if (at !== -1) return at + 1
  const last = body.length - 1
  return last >= 0 && body[last].type === 'text' && isBlank(body[last]) ? last : body.length
}

// Depois de um tópico ou de um versículo citado sempre há um parágrafo —
// é onde a escrita continua.
function withTextAfter(body, index) {
  return body[index + 1]?.type === 'text' || body[index + 1]?.type === 'topic' ? body : [...body.slice(0, index + 1), newSegment('text'), ...body.slice(index + 1)]
}

// "Tópico": o parágrafo vazio com o cursor vira um tópico; senão, um
// tópico novo entra depois do bloco com o cursor. Devolve os blocos e o
// bloco que recebe o cursor.
export function addTopic(body, focusedId = null) {
  const focused = body.find(seg => seg.id === focusedId)
  if (focused?.type === 'text' && isBlank(focused)) {
    const at = body.indexOf(focused)
    const next = body.map(seg => (seg === focused ? { ...seg, type: 'topic', text: '' } : seg))
    return { body: withTextAfter(next, at), focusId: focused.id }
  }
  const at = insertIndex(body, focusedId)
  const topic = newSegment('topic')
  const next = [...body.slice(0, at), topic, ...body.slice(at)]
  return { body: withTextAfter(next, at), focusId: topic.id }
}

// Enter num tópico: com texto, cria o próximo tópico logo abaixo; vazio,
// o tópico volta a ser parágrafo.
export function topicEnter(body, segId) {
  const at = body.findIndex(seg => seg.id === segId)
  if (at === -1 || body[at].type !== 'topic') return { body, focusId: segId }
  if (isBlank(body[at])) return { body: body.map((seg, i) => (i === at ? { ...seg, type: 'text', text: '' } : seg)), focusId: segId }
  const topic = newSegment('topic')
  return { body: [...body.slice(0, at + 1), topic, ...body.slice(at + 1)], focusId: topic.id }
}

const sameRef = (a, b) => a.book === b.book && a.chapter === b.chapter && a.verseStart === b.verseStart && a.verseEnd === b.verseEnd
const isCitation = seg => seg?.type === 'quote' || seg?.type === 'link'

// Junta dois parágrafos que ficaram encostados (ao tirar o bloco que
// estava entre eles). Devolve também onde o cursor fica: na emenda.
function mergeTextAround(body, index) {
  const before = body[index - 1]
  const after = body[index]
  if (before?.type !== 'text' || after?.type !== 'text') return { body, focusId: after?.id ?? before?.id ?? null, caret: 0 }
  const joint = before.text && after.text ? '\n\n' : ''
  const merged = { ...before, text: `${before.text}${joint}${after.text}` }
  return { body: [...body.slice(0, index - 1), merged, ...body.slice(index + 1)], focusId: merged.id, caret: before.text.length + joint.length }
}

// Tira um bloco de versículo citado — o bloco é uma unidade, sai inteiro.
// A passagem sai da lista da anotação, a menos que outro bloco ainda cite
// o mesmo trecho.
export function removeCitation(note, segId) {
  const at = note.body.findIndex(seg => seg.id === segId)
  if (at === -1 || !isCitation(note.body[at])) return { body: note.body, passages: note.passages, focusId: null, caret: 0 }
  const removed = note.body[at]
  const without = [...note.body.slice(0, at), ...note.body.slice(at + 1)]
  const stillCited = without.some(seg => isCitation(seg) && sameRef(seg, removed))
  const passages = stillCited ? note.passages : note.passages.filter(p => !sameRef(p, removed))
  const merged = mergeTextAround(without, at)
  return { ...merged, body: merged.body.length ? merged.body : [newSegment('text')], passages }
}

// Apagar no começo de um bloco (o cursor antes da primeira letra): se o
// bloco de cima é um versículo citado, ele sai inteiro; um tópico vazio
// volta a ser parágrafo; um parágrafo vazio no meio some. Devolve nulo
// quando não há o que fazer (o navegador apaga como sempre).
export function backspaceAtStart(note, segId) {
  const { body } = note
  const at = body.findIndex(seg => seg.id === segId)
  if (at === -1) return null
  const seg = body[at]
  const prev = body[at - 1]
  if (seg.type === 'topic' && isBlank(seg)) return { body: body.map((s, i) => (i === at ? { ...s, type: 'text' } : s)), passages: note.passages, focusId: seg.id, caret: 0 }
  if (isCitation(prev)) return removeCitation(note, prev.id)
  if (seg.type === 'text' && isBlank(seg) && prev && at < body.length - 1) {
    return { body: [...body.slice(0, at), ...body.slice(at + 1)], passages: note.passages, focusId: prev.id, caret: String(prev.text ?? '').length }
  }
  if (seg.type === 'text' && prev?.type === 'text') return { ...mergeTextAround(body, at), passages: note.passages }
  return null
}

// A referência de um trecho citado, por extenso: "Gênesis 43:3", "Tiago
// 1:3-4", "Salmos 13" (o capítulo inteiro).
export function passageLabel(p, lang = 'pt') {
  const verses = p.verseStart ? `:${p.verseStart}${p.verseEnd && p.verseEnd !== p.verseStart ? `-${p.verseEnd}` : ''}` : ''
  return `${bookDisplayName(p.book, lang)} ${p.chapter}${verses}`
}

// "+ Versículo": o trecho escolhido entra como um bloco areia, depois do
// bloco com o cursor, com um parágrafo em seguida. `quote`: { book,
// bookEn, chapter, verseStart, verseEnd, text }. A passagem entra na
// lista da anotação uma vez só, mesmo citada duas vezes.
export function insertCitation(note, quote, focusedId = null, lang = 'pt') {
  const seg = { ...newSegment('quote', quote.text), book: quote.book, bookEn: quote.bookEn ?? null, chapter: quote.chapter, verseStart: quote.verseStart, verseEnd: quote.verseEnd, ref: passageLabel(quote, lang) }
  const at = insertIndex(note.body, focusedId)
  const body = withTextAfter([...note.body.slice(0, at), seg, ...note.body.slice(at)], at)
  const passages = note.passages.some(p => sameRef(p, quote))
    ? note.passages
    : [...note.passages, { book: quote.book, bookEn: quote.bookEn ?? null, chapter: quote.chapter, verseStart: quote.verseStart, verseEnd: quote.verseEnd }]
  // O cursor vai para o parágrafo logo depois do bloco.
  return { body, passages, focusId: body[at + 1].id, insertedId: seg.id }
}

// Do menor ao maior versículo marcado no seletor, num trecho só (marcar 9
// e 14 traz 9–14) — com o texto de cada um.
export function citationFromSelection({ book, bookEn, chapter, verses, selected }) {
  if (!selected?.length) return null
  const verseStart = Math.min(...selected)
  const verseEnd = Math.max(...selected)
  const text = Array.from({ length: verseEnd - verseStart + 1 }, (_, i) => verses?.[String(verseStart + i)]).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return text ? { book, bookEn, chapter, verseStart, verseEnd, text } : null
}

// A folha das passagens citadas: cada passagem da anotação, por extenso,
// com o texto do bloco que a cita (as de anotações antigas, sem bloco,
// vêm só com a referência).
export function passageRows(note, lang = 'pt') {
  return (note?.passages ?? []).map((p, i) => {
    const seg = (note.body ?? []).find(s => isCitation(s) && sameRef(s, p))
    return { key: `${p.book}-${p.chapter}-${p.verseStart ?? 0}-${p.verseEnd ?? 0}-${i}`, label: passageLabel(p, lang), text: seg?.type === 'quote' ? oneLine(seg.text) : '', book: p.book, chapter: p.chapter, verse: p.verseStart ?? null }
  })
}

// Um trecho ditado entra onde está o cursor, com um espaço antes quando
// precisa. Devolve o texto novo e onde o cursor fica.
export function insertDictation(text, heard, start = null, end = null) {
  const current = String(text ?? '')
  const from = start ?? current.length
  const to = end ?? from
  const before = current.slice(0, from)
  const space = before && !/\s$/.test(before) ? ' ' : ''
  return { text: `${before}${space}${heard}${current.slice(to)}`, caret: before.length + space.length + heard.length }
}

// ── O cabeçalho de N2 ───────────────────────────────────────────────────

// "3 passagens" · "1 passagem"; nulo com zero (a pastilha não aparece).
export function passagesPill(note) {
  const n = (note?.passages ?? []).length
  return n > 0 ? `${formatInt(n)} ${plural(n, 'passagem', 'passagens')}` : null
}

// "# 2"; nulo com zero etiquetas.
export function tagsPill(note) {
  const n = (note?.tags ?? []).length
  return n > 0 ? `# ${formatInt(n)}` : null
}

// O tempo anotando: "24 min" (conta só com a página aberta).
export function annotatingLabel(seconds) {
  return `${formatInt(Math.max(1, Math.round((seconds ?? 0) / 60)))} min`
}

// O estado da gravação: "salvando…" · "salvo agora" · "salvo há {n} min".
// Antes da primeira gravação, nada.
export function saveLabel({ saving = false, savedAt = null, now = Date.now() } = {}) {
  if (saving) return 'salvando…'
  if (!savedAt) return ''
  const minutes = Math.floor((now - savedAt) / 60000)
  return minutes < 1 ? 'salvo agora' : `salvo há ${formatInt(minutes)} min`
}

// A segunda linha do cabeçalho: "{Tipo} · {Preletor} · salvo agora" — só o
// que existe. A anotação livre não tem preletor (o campo nem aparece em
// N3), então a linha não mostra um que tenha ficado de outro tipo.
export function headerSecondLine(note, save = {}) {
  const preacher = note?.noteType === 'free' ? '' : oneLine(note?.preacher)
  return [noteTypeName(note?.noteType), preacher, saveLabel(save)].filter(Boolean).join(' · ')
}

export const UNTITLED = 'Sem título'

// ── Detalhes (N3) ───────────────────────────────────────────────────────

// "Terça, 2 de setembro · 20:14" — quando a anotação foi criada.
export function createdLine(createdAt, lang = 'pt') {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  const day = formatWeekdayDate(dateKey(d), lang)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`
}

// As linhas de "De onde veio". Com o tipo Livre, só o Título.
const SOURCE_ROWS = [
  { key: 'title', label: 'Título', placeholder: 'Nome do sermão, aula ou vídeo' },
  { key: 'preacher', label: 'Preletor', placeholder: 'Quem falou' },
  { key: 'church', label: 'Instituição', placeholder: 'Igreja, escola, canal…' },
  { key: 'link', label: 'Link', placeholder: 'Cole o endereço do vídeo' },
]
export function sourceRows(noteType) {
  return noteType === 'free' ? [{ ...SOURCE_ROWS[0], placeholder: 'Um título para esta anotação' }] : SOURCE_ROWS
}

// Os valores já usados num campo (Preletor, Instituição), do mais recente
// para o mais antigo, sem repetir — as sugestões do campo.
export function fieldSuggestions(notes, field, max = 8) {
  const seen = new Map()
  for (const note of notes ?? []) {
    const value = oneLine(note?.[field])
    const key = normalizeForSearch(value)
    if (value && !seen.has(key)) seen.set(key, value)
  }
  return [...seen.values()].slice(0, max)
}

// As etiquetas da pessoa — as das notas de versículo e as das anotações,
// juntas —, das mais usadas para as menos (no empate, em ordem
// alfabética).
export function tagVocabulary({ highlights = [], sermonNotes = [] } = {}) {
  const counts = new Map()
  const add = tags => { for (const tag of new Set((tags ?? []).map(oneLine).filter(Boolean))) counts.set(tag, (counts.get(tag) ?? 0) + 1) }
  for (const h of highlights) if (!h?.hidden) add(h.tags)
  for (const note of sermonNotes) add(note?.tags)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt')).map(([tag]) => tag)
}

// As pastilhas de etiqueta: o vocabulário da pessoa (as mais usadas
// primeiro) e, depois, as que esta anotação tem e ainda não estão nele (a
// recém-criada).
export function tagChoices(vocabulary = [], selected = []) {
  const extra = selected.filter(tag => !vocabulary.includes(tag))
  return [...vocabulary, ...extra].map(tag => ({ tag, label: `# ${tag}`, on: selected.includes(tag) }))
}

// Marca ou desmarca uma etiqueta — mais de uma pode ficar marcada.
export function toggleTag(selected = [], tag) {
  const clean = oneLine(tag)
  if (!clean) return selected
  return selected.includes(clean) ? selected.filter(t => t !== clean) : [...selected, clean]
}

// ── Quem vê ─────────────────────────────────────────────────────────────

export const ONLY_ME = 'only_me'

// Os blocos de "Quem vê": "Só eu / na Biblioteca" primeiro; depois os
// grupos da pessoa, "{n} pessoas". `selected` são os grupos escolhidos —
// vazio é "Só eu".
export function whoSeesBlocks({ groups = [], memberCounts = {}, selected = [] } = {}) {
  const chosen = selected.filter(id => groups.some(g => g.groupId === id))
  return [
    { key: ONLY_ME, title: 'Só eu', sub: 'na Biblioteca', on: chosen.length === 0 },
    ...groups.map(g => {
      const n = memberCounts[g.groupId]
      return { key: g.groupId, title: g.name, sub: n == null ? '' : `${formatInt(n)} ${plural(n, 'pessoa', 'pessoas')}`, on: chosen.includes(g.groupId) }
    }),
  ]
}

// Um toque num bloco: "Só eu" desmarca os grupos; um grupo liga ou
// desliga (mais de um pode ser escolhido); sem grupo nenhum, volta a "Só
// eu". Devolve os grupos escolhidos.
export function toggleWhoSees(selected = [], key) {
  if (key === ONLY_ME) return []
  return selected.includes(key) ? selected.filter(id => id !== key) : [...selected, key]
}

// Os nomes de quem vê: "Só eu" ou os grupos, por extenso.
export function whoSeesLabel({ groups = [], selected = [] } = {}) {
  const names = selected.map(id => groups.find(g => g.groupId === id)?.name).filter(Boolean)
  return names.length ? names.join(' · ') : 'Só eu'
}

export const WHO_SEES_NOTE = 'Nasce só sua. Se escolher um grupo, vão o texto e as passagens — as etiquetas ficam com você.'
// Uma anotação vai para a sala do capítulo de uma passagem citada: sem
// versículo citado, não tem para onde ir.
export const WHO_SEES_NEEDS_PASSAGE = 'Para ir ao grupo, a anotação precisa citar um versículo.'

export function whoSeesWarning({ selected = [], passages = [] } = {}) {
  return selected.length > 0 && passages.length === 0 ? WHO_SEES_NEEDS_PASSAGE : null
}
